const router = require('express').Router()
const bcrypt = require('bcrypt')

const tokenStore = require('../services/token-store')

router.post('/', async (req, res, next) => {
  const password = req.body.password
  const success = await bcrypt.compare(password, process.env.PASSWORD_HASH)
  if (success) {
    const token = await tokenStore.reset()
    return res.send({ token })
  }
  res.sendStatus(403)
})

module.exports = router
