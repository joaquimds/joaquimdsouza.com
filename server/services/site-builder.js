const path = require('path')
const fs = require('fs')
const ejs = require('ejs')

const Message = require('../models/message')

let _layout

const siteBuilder = {
  build: async () => {
    const messages = await Message.findAll()
    const data = { messages, message: messages[0] }

    const clientDir = path.join(__dirname, '..', '..', 'client')
    const src = path.join(clientDir, 'src')
    const dest = path.join(clientDir, 'build')

    _layout = await readFile(path.join(src, '_layout.ejs'))

    await cleanDir(dest)

    await buildJs(src, '_global.js', dest, 'global.js')
    await buildScss(src, '_global.scss', dest, 'global.css')

    return buildDir(clientDir, 'src', dest, data)
  }
}

async function cleanDir (dir) {
  console.log('Cleaning', dir)
  const files = await listDir(dir)
  const toRemove = files.filter(file => file !== '.gitkeep')
  for (const file of toRemove) {
    const filePath = path.join(dir, file)
    const isDirectory = await isDir(filePath)
    if (isDirectory) {
      await cleanDir(filePath)
      await rmDir(filePath)
      continue
    }
    await unlink(filePath)
  }
}

async function buildDir (parentPath, dirName, dest, data) {
  const srcPath = path.join(parentPath, dirName)
  console.log('Building', srcPath)

  const files = await listDir(srcPath)
  for (const file of files) {
    const isDirectory = await isDir(path.join(srcPath, file))
    const isIterator = isDirectory && file === '_each'
    switch (true) {
      case isIterator:
        const items = data[dirName]
        for (const item of items) {
          await buildDir(srcPath, file, dest, item)
        }
        break;
      case isDirectory:
        const newDest = path.join(dest, file)
        await makeDir(newDest)
        await buildDir(srcPath, file, newDest, data)
        break
      case file.indexOf('_') === 0:
        // Skip files that start with '_'
        break;
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
        await copyFile(srcPath, file, dest)
    }
  }
}

function buildJs (srcDir, filename, destDir, destFilename) {
  return copyFile(srcDir, filename, destDir, destFilename)
}

function buildScss (srcDir, filename, destDir, destFilename) {
  return copyFile(srcDir, filename, destDir, destFilename)
}

async function buildEjs (srcDir, filename, destDir, data) {
  console.log('rendering', path.join(srcDir, filename), data)
  const template = await readFile(path.join(srcDir, filename))
  const page = ejs.render(template, data, {})
  const html = ejs.render(_layout, { page }, {})

  const destFilename = replaceVariablesInFilename(filename, data)

  const dest = path.join(destDir, destFilename.split('.ejs')[0] + '.html')

  return writeFile(dest, html)
}

function replaceVariablesInFilename (filename, data) {
  while (filename.indexOf('[[') > -1) {
    let startingParts = filename.split('[[')
    const firstPart = startingParts.shift()
    startingParts = [ firstPart, startingParts.join('[[') ]

    let closingParts = startingParts[1].split(']]')
    const variableNamePart = closingParts[0]
    const variableName = variableNamePart.trim()
    const value = data[variableName]
    const regex = new RegExp('\\[\\[' + variableNamePart + '\\]\\]')
    filename = filename.replace(regex, value)
  }
  return filename
}

function copyFile (srcDir, filename, destDir, destFilename) {
  const src = path.join(srcDir, filename)
  const dest = path.join(destDir, destFilename || filename)
  return new Promise((resolve, reject) => {
    fs.copyFile(src, dest, (err) => {
      if (err) {
        return reject(err)
      }
      resolve()
    })
  })
}

function readFile (src) {
  return new Promise((resolve, reject) => {
    fs.readFile(src, 'utf8', (err, str) => {
      if (err) {
        return reject(err)
      }
      resolve(str)
    })
  })
}

function writeFile (dest, str) {
  return new Promise((resolve, reject) => {
    fs.writeFile(dest, str, (err) => {
      if (err) {
        return reject(err)
      }
      resolve()
    })
  })
}

function listDir (dir) {
  return new Promise((resolve, reject) => {
    fs.readdir(dir, (err, files) => {
      if (err) {
        return reject(err)
      }
      resolve(files)
    })
  })
}

function isDir (dir) {
  return new Promise((resolve, reject) => {
    fs.lstat(dir, (err, stats) => {
      if (err) {
        return reject(err)
      }
      resolve(stats.isDirectory())
    })
  })
}

function makeDir (dir) {
  return new Promise((resolve, reject) => {
    fs.mkdir(dir, (err) => {
      if (err) {
        return reject(err)
      }
      resolve()
    })
  })
}

function unlink (file) {
  return new Promise((resolve, reject) => {
    fs.unlink(file, (err) => {
      if (err) {
        return reject(err)
      }
      resolve()
    })
  })
}

function rmDir (dir) {
  return new Promise((resolve, reject) => {
    fs.rmdir(dir, (err) => {
      if (err) {
        return reject(err)
      }
      resolve()
    })
  })
}

module.exports = siteBuilder
