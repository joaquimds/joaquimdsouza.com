require('dotenv').load()

const sequelize = require('../server/services/sequelize')

require('../server/models/message');

(async () => {
  await sequelize.sync({ force: true })
  await sequelize.close()
})()
