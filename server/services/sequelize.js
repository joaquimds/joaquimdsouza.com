const Sequelize = require('sequelize')

const sequelize = new Sequelize(process.env.DB_URI, { dialect: 'postgres', operatorsAliases: false })

module.exports = sequelize
