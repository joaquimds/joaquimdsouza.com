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
    const messages = await Message.findAll()
    const data = {messages, message: messages[0]}

    const clientDir = path.join(__dirname, '..', '..', 'client')
    const src = path.join(clientDir, 'src')
    const dest = path.join(clientDir, 'build')

    _layout = await readFile(path.join(src, '_layout.ejs'))

    await cleanDir(dest)

    await buildJs(src, '_global.js', dest, 'global.js')
    await buildScss(src, '_global.scss', dest, 'global.css')
    await buildDir(clientDir, 'src', dest, data)
  }
}

async function cleanDir (dir) {
  console.log('Cleaning', dir)
  const files = await readDir(dir)
  const toRemove = files.filter(file => file !== '.gitkeep')
  for (const file of toRemove) {
    const filePath = path.join(dir, file)
    const isDirectory = await isDir(filePath)
    if (isDirectory) {
      await cleanDir(filePath)
      await deleteDir(filePath)
      continue
    }
    await deleteFile(filePath)
  }
}

async function buildDir (parentPath, dirName, dest, data) {
  const srcPath = path.join(parentPath, dirName)
  console.log('Building', srcPath)

  const files = await readDir(srcPath)
  for (const file of files) {
    const isDirectory = await isDir(path.join(srcPath, file))
    const isIterator = isDirectory && file === '_each'
    switch (true) {
      case isIterator:
        const items = data[dirName]
        for (const item of items) {
          await buildDir(srcPath, file, dest, item)
        }
        break
      case isDirectory:
        const newDest = path.join(dest, file)
        await makeDir(newDest)
        await buildDir(srcPath, file, newDest, data)
        break
      case file.indexOf('_') === 0:
        // Skip files that start with '_'
        break
      case file.indexOf('.js') > -1:
        await buildJs(srcPath, file, dest)
        break
      case file.indexOf('.scss') > -1:
        await buildScss(srcPath, file, dest)
        break
      case file.indexOf('.ejs') > -1:
        await buildEjs(srcPath, file, dest, data)
        break
      default:
        await copyFile(srcPath, path.join(dest, file))
    }
  }
}

async function buildJs (srcDir, filename, destDir, destFilename) {
  const expandedJs = await browserifyJs(path.join(srcDir, filename))
  const transpiledJs = babel.transform(expandedJs, {presets: ['babel-preset-env']})
  await writeFile(path.join(destDir, destFilename || filename), transpiledJs.code)
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

async function buildScss (srcDir, filename, destDir, destFilename) {
  const scss = await compileScss(path.join(srcDir, filename))
  await writeFile(path.join(destDir, destFilename || filename.split('.scss')[0] + '.css'), scss)
}

function compileScss (file) {
  return new Promise((resolve, reject) => {
    sass.render({
      file
    }, (err, result) => {
      if (err) {
        return reject(err)
      }
      resolve(result)
    })
  })
}

async function buildEjs (srcDir, filename, destDir, data) {
  const template = await readFile(path.join(srcDir, filename))
  const page = ejs.render(template, data, {})
  const html = ejs.render(_layout, {page}, {})

  const destFilename = replaceVariablesInFilename(filename, data)

  const dest = path.join(destDir, destFilename.split('.ejs')[0] + '.html')

  await writeFile(dest, html)
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
