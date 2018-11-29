var SauceConnect = require('./src/sauce_connect')
var SauceLauncher = require('./src/sauce_launcher')
var SauceReporter = require('./src/sauce_reporter')

// PUBLISH DI MODULE
module.exports = {
  'sauceConnect': ['type', SauceConnect],
  'launcher:SauceLabs': ['type', SauceLauncher],
  'reporter:saucelabs': ['type', SauceReporter],

  // We keep a mapping from Karma launch IDs to Sauce job IDs here, to report the pass/fail results.
  // We also keep the Sauce credentials here - theoretically different credentials can be used for
  // different browsers in the same session.
  'sauce:jobMapping': ['value', {}]
}
