const fs = require('fs')

module.exports = {

  fileExists: (src) => {
    return new Promise((resolve, reject) => {
      fs.lstat(src, (err, stats) => {
        if (err && err.code !== 'ENOENT') {
          return reject(err)
        }
        resolve(Boolean(stats))
      })
    })
  },

  copyFile: (src, dest) => {
    return new Promise((resolve, reject) => {
      fs.copyFile(src, dest, (err) => {
        if (err) {
          return reject(err)
        }
        resolve()
      })
    })
  },

  readFile: (src, encoding = 'utf8') => {
    return new Promise((resolve, reject) => {
      fs.readFile(src, encoding, (err, str) => {
        if (err) {
          return reject(err)
        }
        resolve(str)
      })
    })
  },

  writeFile: (dest, str) => {
    return new Promise((resolve, reject) => {
      fs.writeFile(dest, str, (err) => {
        if (err) {
          return reject(err)
        }
        resolve()
      })
    })
  },

  readDir: (dir) => {
    return new Promise((resolve, reject) => {
      fs.readdir(dir, (err, files) => {
        if (err) {
          return reject(err)
        }
        resolve(files)
      })
    })
  },

  isDir: (dir) => {
    return new Promise((resolve, reject) => {
      fs.lstat(dir, (err, stats) => {
        if (err) {
          return reject(err)
        }
        resolve(stats.isDirectory())
      })
    })
  },

  makeDir: (dir) => {
    return new Promise((resolve, reject) => {
      fs.mkdir(dir, (err) => {
        if (err) {
          return reject(err)
        }
        resolve()
      })
    })
  },

  deleteFile: (file) => {
    return new Promise((resolve, reject) => {
      fs.unlink(file, (err) => {
        if (err) {
          return reject(err)
        }
        resolve()
      })
    })
  },

  deleteDir: (dir) => {
    return new Promise((resolve, reject) => {
      fs.rmdir(dir, (err) => {
        if (err) {
          return reject(err)
        }
        resolve()
      })
    })
  }
}
