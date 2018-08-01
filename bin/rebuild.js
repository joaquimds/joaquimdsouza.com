require('dotenv').load()

const sequelize = require('../server/services/sequelize')
const siteBuilder = require('../server/services/site-builder');

(async () => {
  try {
    await siteBuilder.build()
  } catch (e) {
    console.log('Error', e.message)
  }
  await sequelize.close()
})()
