const tokenStore = require('../services/token-store')

module.exports = function (req, res, next) {
  const authHeader = req.get('Authorization')
  if (!authHeader) {
    return next()
  }
  const token = authHeader.split('TOKEN ')[1]
  req.isAdmin = tokenStore.check(token)
  next()
}
