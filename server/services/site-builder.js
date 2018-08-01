const path = require('path')
const ejs = require('ejs')
const browserify = require('browserify')
const babel = require('babel-core')
const sass = require('node-sass')

const {copyFile, readFile, writeFile, isDir, readDir, makeDir, deleteFile, deleteDir} = require('./fs')
const Message = require('../models/message')

let _layout

const siteBuilder = {
  build: async () => {
    const messages = await Message.findAll({ order: [ [ 'id', 'DESC' ] ] })
    const data = {messages, message: messages[0]}

    const rootDir = path.join(__dirname, '..', '..')
    const src = path.join(rootDir, 'client')
    const dest = path.join(rootDir, 'build')

    _layout = await readFile(path.join(src, '_layout.ejs'))

    console.log('Cleaning', dest)
    await cleanDir(dest)

    await buildDir(src, dest, data)
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

  const toRemove = files.filter(file => file !== '.gitkeep')
  for (const file of toRemove) {
    const filePath = path.join(dir, file)
    const isDirectory = await isDir(filePath)
    if (isDirectory) {
      await cleanDir(filePath)
      continue
    }
    await deleteFile(filePath)
  }

  await deleteDir(dir)
}

async function buildDir (rootDir, destDir, data) {
  console.log(`Building ${rootDir} => ${destDir}`)

  await makeDir(destDir)

  const files = await readDir(rootDir)
  for (const filename of files) {
    const srcPath = path.join(rootDir, filename)
    const destPath = getDestPath(destDir, filename)
    const isDirectory = await isDir(srcPath)
    switch (true) {
      case isDirectory:
        await buildDir(srcPath, destPath, data)
        break
      case filename.indexOf('_each') === 0:
        const parentDirName = path.basename(rootDir)
        const items = data[parentDirName]
        for (const item of items) {
          await buildEjs(srcPath, destPath, item)
        }
        break
      case filename.indexOf('_') === 0:
        // Skip files that start with '_'
        break
      case filename.indexOf('.js') > -1:
        await buildJs(srcPath, destPath)
        break
      case filename.indexOf('.scss') > -1:
        await buildScss(srcPath, destPath)
        break
      case filename.indexOf('.ejs') > -1:
        await buildEjs(srcPath, destPath, data)
        break
      default:
        await copyFile(srcPath, destPath)
    }
  }
}

function getDestPath (dir, filename) {
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
        break;
      case 'ejs':
        filename = filenameParts.join('.') + '.html'
        break;
    }
  }

  return path.join(dir, filename)
}

async function buildJs (src, dest) {
  console.log(`Building ${src} => ${dest}`)

  const expandedJs = await browserifyJs(src)
  const transpiledJs = babel.transform(expandedJs, {presets: ['babel-preset-env']})
  await writeFile(dest, transpiledJs.code)
}

function browserifyJs (src) {
  return new Promise((resolve, reject) => {
    let script = ''

    const browserifyStream = browserify()
    browserifyStream.add(src)
    browserifyStream
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
  console.log(`Building ${src} => ${dest}`)

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
  console.log(`Building ${src} => ${dest}`)

  const template = await readFile(src)
  const page = ejs.render(template, data, {})
  const html = ejs.render(_layout, {page}, {})

  const expandedDest = replaceVariablesInFilename(dest, data)

  await writeFile(expandedDest, html)
}

function replaceVariablesInFilename (filename, data) {
  while (filename.indexOf('[[') > -1) {
    let startingParts = filename.split('[[')
    const firstPart = startingParts.shift()
    startingParts = [firstPart, startingParts.join('[[')]

    let closingParts = startingParts[1].split(']]')
    const variableNamePart = closingParts[0]
    const variableName = variableNamePart.trim()
    const value = data[variableName]
    const regex = new RegExp('\\[\\[' + variableNamePart + '\\]\\]')
    filename = filename.replace(regex, value)
  }
  return filename
}

module.exports = siteBuilder
