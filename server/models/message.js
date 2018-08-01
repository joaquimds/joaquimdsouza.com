const Sequelize = require('sequelize')
const sequelize = require('../services/sequelize')

const Message = sequelize.define('message', {
  name: Sequelize.STRING,
  body: {
    type: Sequelize.STRING,
    unique: true
  }
})

module.exports = Message
