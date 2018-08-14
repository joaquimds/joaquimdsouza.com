const createError = require('http-errors')
const express = require('express')
const path = require('path')

const app = express()

app.use(express.json())
app.use(express.urlencoded({ extended: false }))
app.use(express.static(path.join(__dirname, '..', 'build')))
app.use(express.static(path.join(__dirname, '..', 'temp')))

app.use('/', require('./middleware/auth'))
app.use('/api', require('./routes'))

// catch 404 and forward to error handler
app.use((req, res, next) => {
  next(createError(404))
})

// error handler
app.use((err, req, res, next) => {
  console.log(`Error: ${err.message} (path: ${req.url}, method: ${req.method})`)

  // render the error page
  res.status(err.status || 500)
  res.send('error')
})

module.exports = app
