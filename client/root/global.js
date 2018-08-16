require('babel-polyfill')
require('whatwg-fetch')

if (!window.localStorage) {
  window.localStorage = {}
}

require('../components/accessibility/control')
