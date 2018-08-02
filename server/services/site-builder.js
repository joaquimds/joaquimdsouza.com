const path = require('path')
const ejs = require('ejs')
const browserify = require('browserify')
const sass = require('node-sass')

const {copyFile, writeFile, isDir, readDir, makeDir, deleteFile, deleteDir} = require('./fs')
const Message = require('../models/message')

const projectDir = path.join(__dirname, '..', '..')
const clientDir = path.join(projectDir, 'client')

const src = path.join(clientDir, 'root')
const temp = path.join(projectDir, 'temp')
const dest = path.join(projectDir, 'build')

const layoutPath = path.join(clientDir, 'layout.ejs')

const siteBuilder = {
  build: async () => {
    const messages = await Message.findAll({order: [['id', 'DESC']], raw: true})
    const data = {messages, message: messages[0]}

    await cleanDir(temp)
    await buildDir(src, temp, data)
    await cleanDir(dest)
    await copyDir(temp, dest)

    console.log('Build complete')
  }
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

  let files
  try {
    files = await readDir(src)
  } catch (e) {
    if (e.code === 'ENOENT') {
      return
    }
    throw e
  }

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

async function buildDir (rootDir, destDir, data) {
  console.log(`Building directory ${rootDir} => ${destDir}`)

  await makeDir(destDir)

  const files = await readDir(rootDir)
  for (const filename of files) {
    const srcPath = path.join(rootDir, filename)
    const destPath = getDestPath(destDir, filename, data)

    const isDirectory = await isDir(srcPath)
    const isEjs = filename.indexOf('.ejs') > -1
    switch (true) {
      case filename.indexOf('_each') === 0 && isEjs:
        const parentDirName = path.basename(rootDir)
        const items = data[parentDirName]
        for (const item of items) {
          await buildEjs(srcPath, destPath, {item})
        }
        break
      case filename.indexOf('_') === 0:
        // Skip files that start with '_'
        break
      case isDirectory:
        await buildDir(srcPath, destPath, data)
        break
      case filename.indexOf('.js') > -1:
        await buildJs(srcPath, destPath)
        break
      case filename.indexOf('.scss') > -1:
        await buildScss(srcPath, destPath)
        break
      case isEjs:
        await buildEjs(srcPath, destPath, data)
        break
      default:
        await copyFile(srcPath, destPath)
    }
  }
}

function getDestPath (destDir, filename, data) {
  // remove iterator marker
  if (filename.indexOf('_each.') === 0) {
    filename = filename.substring(6)
  }

  const filenameParts = filename.split('.')

  if (filenameParts.length > 1) {
    const extension = filenameParts.pop()
    switch (extension) {
      case 'scss':
        filename = filenameParts.join('.') + '.css'
        break
      case 'ejs':
        filename = filenameParts.join('.') + '.html'
        break
    }
  }

  return path.join(destDir, filename)
}

async function buildJs (src, dest) {
  console.log(`Building script ${src} => ${dest}`)

  const expandedJs = await browserifyJs(src)

  await writeFile(dest, expandedJs)
}

function browserifyJs (src) {
  return new Promise((resolve, reject) => {
    let script = ''

    browserify(src)
      .transform('babelify', {presets: ['babel-preset-minify', 'babel-preset-env'], global: true})
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
      file
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

  const page = await renderEjs(src, data)
  const html = await renderEjs(layoutPath, {page})

  await writeFile(expandedDest, html)
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

function replaceVariablesInFilename (filename, data) {
  const regex = new RegExp('\\[\\[(.*)\\]\\]')

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

module.exports = siteBuilder
