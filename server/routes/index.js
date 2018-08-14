const router = require('express').Router()

router.use('/login', require('./login'))
router.use('/message', require('./message'))

module.exports = router
