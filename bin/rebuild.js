require('dotenv').load()

const sequelize = require('../server/services/sequelize')
const siteBuilder = require('../server/services/site-builder');

(async () => {
  await siteBuilder.build()
  await sequelize.close()
})()
