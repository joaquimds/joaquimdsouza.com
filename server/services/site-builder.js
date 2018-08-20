const path = require('path')
const ejs = require('ejs')
const cheerio = require('cheerio')
const browserify = require('browserify')
const sass = require('node-sass')
const {queue} = require('async')
const EventEmitter = require('events')

const {fileExists, copyFile, readFile, writeFile, isDir, readDir, makeDir, deleteFile, deleteDir} = require('./fs')
const Message = require('../models/message')

const devMode = process.env.NODE_ENV === 'development'

const projectDir = path.join(__dirname, '..', '..')
const clientDir = path.join(projectDir, 'client')

const src = path.join(clientDir, 'root')
const temp = path.join(projectDir, 'temp')
const dest = path.join(projectDir, 'build')
let cache

const layoutPath = path.join(clientDir, 'layout.ejs')
const version = Date.now()

const buildEmitter = new EventEmitter()
const buildQueue = queue(async () => {
  await buildSite()
}, 1)

const siteBuilder = {
  build: () => buildSite(),
  ensureBuild: () => {
    return new Promise((resolve, reject) => {
      buildEmitter.once('complete', () => {
        resolve()
      })

      // only add to the queue if there are no builds waiting
      if (buildQueue.length() === 0) {
        buildQueue.push({}, (err) => {
          if (err) {
            console.log('Error', err)
          }
          buildEmitter.emit('complete')
        })
      }
    })
  }
}

async function buildSite () {
  if (!cache) {
    cache = path.join(projectDir, 'cache')
    await cleanDir(cache)
    await makeDir(cache)
  }

  const buildDate = new Date()
  const messages = await Message.findAll({order: [['id', 'DESC']], raw: true})
  const data = {messages, message: messages[0], buildDate, version}

  await cleanDir(temp)
  await buildDir(src, temp, data)
  await postBuild(temp, data)

  await cleanDir(dest)
  await copyDir(temp, dest)

  console.log('Build complete')
}

async function cleanDir (dir) {
  let files
  try {
    files = await readDir(dir)
  } catch (e) {
    if (e.code === 'ENOENT') {
      return
    }
    throw e
  }

  for (const file of files) {
    const filePath = path.join(dir, file)
    const isDirectory = await isDir(filePath)
    if (isDirectory) {
      await cleanDir(filePath)
      continue
    }

    await deleteFile(filePath)
  }

  await deleteDir(dir)

  console.log('Cleaned directory', dir)
}

async function copyDir (src, dest) {
  console.log(`Copying directory ${src} => ${dest}`)

  const files = await readDir(src)

  await makeDir(dest)

  for (const file of files) {
    const srcPath = path.join(src, file)
    const destPath = path.join(dest, file)
    const isDirectory = await isDir(srcPath)
    if (isDirectory) {
      await copyDir(srcPath, destPath)
      continue
    }
    await copyFile(srcPath, destPath)
  }
}

async function buildDir (srcDir, destDir, data) {
  console.log(`Building directory ${srcDir} => ${destDir}`)
  data.dirRoute = data.dirRoute || '/'

  await makeDir(destDir)

  const files = await readDir(srcDir)

  for (const filename of files) {
    const srcPath = path.join(srcDir, filename)
    const destPath = getDestPath(destDir, filename)
    const isDirectory = await isDir(srcPath)

    if (isDirectory) {
      const childData = { ...data, dirRoute: data.dirRoute + filename + '/' }
      await buildDir(srcPath, destPath, childData)
      continue
    }

    const extension = getFileExtension(filename)
    switch (true) {
      case filename.indexOf('_each') === 0:
        await buildIterator(srcPath, destPath, data)
        break
      case extension === 'js':
        await buildJs(srcPath, destPath)
        break
      case extension === 'scss':
        await buildScss(srcPath, destPath)
        break
      case extension === 'ejs':
        await buildEjs(srcPath, destPath, data)
        break
      default:
        await copyFile(srcPath, destPath)
    }
  }
}

async function postBuild (siteDir, data) {
  console.log(`Processing site ${siteDir}`)

  const pages = await processPages(siteDir)
  const pageRoutes = pages.map(page => getRelativeRoute(siteDir, page))

  await buildSitemap(path.join(siteDir, 'sitemap.xml'), pageRoutes, data.buildDate)
}

async function buildIterator (src, dest, data) {
  console.log(`Building iterator ${src} => ${dest}`)

  const parentDirName = path.basename(path.dirname(src))
  const items = data[parentDirName]
  for (const item of items) {
    await buildEjs(src, dest, {item, ...data})
  }
}

async function buildJs (src, dest) {
  console.log(`Building script ${src} => ${dest}`)

  const cachedFile = path.join(cache, encodeURIComponent(src))
  const isCached = await fileExists(cachedFile)

  if (!isCached) {
    const expandedJs = await browserifyJs(src)
    await writeFile(cachedFile, expandedJs)
  }

  await copyFile(cachedFile, dest)
}

function browserifyJs (src) {
  return new Promise((resolve, reject) => {
    let script = ''
    const presets = ['babel-preset-env']
    if (!devMode) {
      presets.push('babel-preset-minify')
    }

    browserify(src, {debug: devMode})
      .transform('babelify', {presets, global: true})
      .bundle()
      .on('data', buf => {
        script += buf.toString()
      })
      .on('end', () => {
        resolve(script)
      })
      .on('error', err => {
        reject(err)
      })
  })
}

async function buildScss (src, dest) {
  console.log(`Building css ${src} => ${dest}`)

  const scss = await compileScss(src)
  await writeFile(dest, scss)
}

function compileScss (file) {
  return new Promise((resolve, reject) => {
    sass.render({
      file,
      outputStyle: devMode ? 'nested' : 'compressed'
    }, (err, result) => {
      if (err) {
        return reject(err)
      }
      resolve(result.css.toString())
    })
  })
}

async function buildEjs (src, dest, data) {
  const expandedDest = replaceVariablesInFilename(dest, data)
  console.log(`Building html ${src} => ${expandedDest}`)

  const filename = path.basename(expandedDest)
  const route = data.dirRoute + (filename === 'index.html' ? '' : filename)

  const page = await renderEjs(src, data)

  const $ = cheerio.load(page)
  const $h1 = $('h1')
  const title = $h1.text()
  $h1.remove()

  const html = await renderEjs(layoutPath, {page: $('body').html(), title, route, ...data})

  await writeFile(expandedDest, html)
}

function buildSitemap (dest, pageRoutes, date) {
  const isoDate = date.toISOString()
  const pages = pageRoutes.map(route => {
    const depth = route.split('/').filter(Boolean).length
    const priority = Math.floor(100 / (depth / 4 + 1)) / 100
    return {
      route,
      priority
    }
  })
  pages.sort((a, b) => a.priority > b.priority ? -1 : 1)
  const xml = `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9
        http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">${pages.map(page => `
    <url>
        <loc>https://joaquimdsouza.com${page.route}</loc>
        <lastmod>${isoDate}</lastmod>
        <priority>${page.priority}</priority>
    </url>`).join('')}
</urlset>`
  return writeFile(dest, xml)
}

function renderEjs (src, data) {
  return new Promise((resolve, reject) => {
    ejs.renderFile(src, data, {}, (err, str) => {
      if (err) {
        return reject(err)
      }
      resolve(str)
    })
  })
}

function getDestPath (destDir, filename) {
  // remove iterator marker
  if (filename.indexOf('_each.') === 0) {
    filename = filename.substring(6)
  }

  const extension = getFileExtension(filename)
  switch (extension) {
    case 'scss':
      filename = filename.replace('.scss', '.css')
      break
    case 'ejs':
      filename = filename.replace('.ejs', '.html')
      break
  }

  return path.join(destDir, filename)
}

function getFileExtension (filename) {
  const parts = filename.split('.')
  if (parts.length > 1) {
    return parts.pop()
  }
  return ''
}

function replaceVariablesInFilename (filename, data) {
  const regex = new RegExp('\\[\\[(.*)]]')

  while (regex.test(filename)) {
    const match = filename.match(regex)
    const toReplace = match[0]
    const variableName = match[1].trim()

    const variableNamePath = variableName.split('.')
    let value = data
    while (variableNamePath.length > 0) {
      value = value[variableNamePath.shift()]
    }

    filename = filename.replace(toReplace, value)
  }

  return filename
}

async function processPages (siteDir, currentDir) {
  currentDir = currentDir || siteDir

  let pages = []
  const files = await readDir(currentDir)

  for (const file of files) {
    const srcPath = path.join(currentDir, file)
    const extension = getFileExtension(file)

    if (extension === 'html') {
      if (!devMode) {
        await inlineCss(siteDir, srcPath)
      }
      pages.push(srcPath)
      continue
    }

    const isDirectory = await isDir(srcPath)
    if (isDirectory) {
      const extraPages = await processPages(siteDir, srcPath)
      pages = pages.concat(extraPages)
    }
  }

  return pages
}

async function inlineCss (root, src) {
  const html = await readFile(src)
  const $ = cheerio.load(html)
  const links = $('link').toArray()
  for (const link of links) {
    const $link = $(link)
    const href = $link.attr('href')
    const parent = href.indexOf('/') === 0 ? root : path.dirname(src)
    const assetPath = path.join(parent, href)
    const css = await readFile(assetPath)
    $link.after(`<style>${css.trim()}</style>`)
    $link.remove()
    await writeFile(src, $.html())
  }
}

function getRelativeRoute (root, path) {
  const relativePath = path.split(root)[1]
  const simplePath = relativePath.split('index.html')[0]

  if (process.platform === 'win32') {
    return simplePath.replace(/\\/g, '/')
  }
  return simplePath
}

module.exports = siteBuilder
