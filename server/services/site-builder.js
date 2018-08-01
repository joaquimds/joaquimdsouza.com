const path = require('path')
const fs = require('fs')

const Message = require('../models/message')

const siteBuilder = {
  build: async () => {
    const messages = await Message.findAll()
    const data = { messages }

    const root = path.join(__dirname, '..', '..', 'client', 'src')
    const dest = path.join(__dirname, '..', '..', 'client', 'build')

    await cleanDir(dest)

    return buildDir(root, dest, data)
  }
}

async function cleanDir (dir) {
  const files = await listDir(dir)
  for (const file of files) {
    await unlink(file)
  }
}

async function buildDir (src, dest, data) {
  const files = await listDir(src)
  for (const file of files) {
    const isDirectory = await isDir(file)
    switch (true) {
      case isDirectory:
        const newSrc = path.join(src, file)
        const newDest = path.join(dest, file)
        await buildDir(newSrc, newDest, data)
        break
      case file.indexOf('.js') > -1:
        await buildJs(src, file, dest)
        break
      case file.indexOf('.scss') > -1:
        await buildScss(src, file, dest)
        break
      case file.indexOf('.ejs') > -1:
        await buildEjs(src, file, dest)
        break
      default:
        await copyFile(src, file, dest)
    }
  }
}

function buildJs (srcDir, filename, destDir) {
  return copyFile(srcDir, filename, destDir)
}

function buildScss (srcDir, filename, destDir) {
  return copyFile(srcDir, filename, destDir)
}

function buildEjs (srcDir, filename, destDir) {
  return copyFile(srcDir, filename, destDir)
}

function copyFile (srcDir, filename, destDir) {
  const src = path.join(srcDir, filename)
  const dest = path.join(destDir, filename)
  return new Promise((resolve, reject) => {
    fs.copyFile(src, dest, (err) => {
      if (err) {
        return reject(err)
      }
      resolve(err)
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
      return stats.isFile()
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

module.exports = siteBuilder
