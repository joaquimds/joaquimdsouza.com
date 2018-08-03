const EventEmitter = require('events')
const router = require('express').Router()
const { queue } = require('async')

const Message = require('../models/message')
const siteBuilder = require('../services/site-builder')

const buildQueue = queue(async (task, callback) => {
  await siteBuilder.build()
  callback()
}, 1)

const buildEmitter = new EventEmitter()

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
    return res.sendStatus(409)
  }

  buildEmitter.once('complete', () => {
    res.sendStatus(200)
  })

  // only add to the queue if there are no builds waiting
  if (buildQueue.length() === 0) {
    buildQueue.push({}, () => {
      buildEmitter.emit('complete')
    })
  }
})

module.exports = router
