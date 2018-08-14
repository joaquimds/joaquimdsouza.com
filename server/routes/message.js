const router = require('express').Router()

const siteBuilder = require('../services/site-builder')
const Message = require('../models/message')

router.post('/', async (req, res) => {
  const name = req.body.name
  const message = req.body.message

  if (!name || !message) {
    return res.sendStatus(400)
  }

  try {
    await Message.create({name: name.substring(0, 64), body: message.substring(0, 256)})
  } catch (e) {
    console.log('Error', e.message)
    return res.sendStatus(409)
  }

  try {
    await siteBuilder.build()
  } catch (e) {
    console.log('Error', e.message)
    return res.sendStatus(500)
  }

  res.sendStatus(200)
})

router.delete('/:id', async (req, res) => {
  if (!req.isAdmin) {
    return res.sendStatus(403)
  }
  try {
    await Message.destroy({
      where: {
        id: req.params.id
      }
    })
    await siteBuilder.build()
  } catch (e) {
    console.log('Error', e.message)
    return res.sendStatus(500)
  }
  return res.sendStatus(200)
})

module.exports = router
