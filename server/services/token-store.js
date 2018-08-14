const crypto = require('crypto')

let token

module.exports = {
  reset: () => new Promise((resolve, reject) => {
    crypto.randomBytes(128, (err, buffer) => {
      if (err) {
        return reject(err)
      }
      token = buffer.toString('hex')
      resolve(token)
    })
  }),
  check: _token => {
    return token && (token === _token)
  }
}
