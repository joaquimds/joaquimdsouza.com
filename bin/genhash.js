const bcrypt = require('bcrypt')

const salt = bcrypt.genSaltSync(10)
const password = process.argv[2]
const hash = bcrypt.hashSync(password, salt)

console.log('password', password)
console.log('hash', hash)
