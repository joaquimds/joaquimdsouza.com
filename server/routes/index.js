const router = require('express').Router()

const Message = require('../models/message')
const siteBuilder = require('../services/site-builder')

router.post('/commit', async (req, res, next) => {
  const name = req.body.name
  const message = req.body.message

  if (!name || !message) {
    return res.sendStatus(400)
  }

  try {
    await Message.create({name: name.substring(0, 64), body: message.substring(0, 256)})
  } catch (e) {
    console.log('Error', e.message)
    return res.sendStatus(400)
  }

  await siteBuilder.build()

  res.sendStatus(200)
})

module.exports = router
