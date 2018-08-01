const router = require('express').Router()

const Message = require('../models/message')
const siteBuilder = require('../services/site-builder')

router.post('/commit', async (req, res, next) => {
  const name = req.get('name')
  const message = req.get('message')

  if (!name || !message) {
    return res.sendStatus(400)
  }

  try {
    await Message.create({name, message})
  } catch (e) {
    console.log('Error', e.message)
    return res.sendStatus(400)
  }

  await siteBuilder.build()

  res.sendStatus(200)
})
