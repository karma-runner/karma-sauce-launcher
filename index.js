// TODO(vojta):
// - clean up logs
// - add concrete browsers
// - more config (+ global config)

var q = require('q');
var wd = require('wd');
var launchSauceConnect = require('sauce-connect-launcher');


var SauceConnect = function(emitter) {
  var alreadyRunningDefered;
  var alreadyRunningProces;
  var onKilled;

  this.start = function(username, apiKey, done) {
    var options = {
      username: username,
      accessKey: apiKey,
      verbose: false,
      logfile: null,
      logger: console.log,
      no_progress: false
    };

    // TODO(vojta): if different username/apiKey, start a new process
    if (alreadyRunningDefered) {
      console.log('SauceConnect already running or starting...');
      return alreadyRunningDefered.promise;
    }

    console.log('Starting SauceConnect...', username, apiKey);
    alreadyRunningDefered = q.defer();
    launchSauceConnect(options, function(err, p) {
      if (onKilled) {
        return onKilled();
      }

      console.log('SauceConnect is ready...');
      alreadyRunningProces = p;
      alreadyRunningDefered.resolve();
    });

    return alreadyRunningDefered.promise;
  };

  emitter.on('exit', function(done) {
    if (alreadyRunningProces) {
      console.log('Killing SauceConnect...');
      onKilled = done;
      alreadyRunningProces.close();
    } else {
      done();
    }
  });
};


var SauceLabBrowser = function(id, args, sauceConnect, /* config.sauceLabs */ config) {
  config = config || {};

  var username = process.env.SAUCE_USERNAME || args.username || config.username;
  var apiKey = process.env.SAUCE_API_KEY || args.apiKey || config.apiKey;

  var driver;
  var captured = false;

  this.id = id;
  this.name = args.browserName + ' on SauceLabs';

  var pendingHeartBeat;
  var heartbeat = function() {
    pendingHeartBeat = setTimeout(function() {
      driver.title();
      heartbeat();
    }, 60000);
  };

  var start = function(url) {
    var options = {
      browserName: args.browserName,
      tags: args.tags || [],
      name: args.testName || 'Karma test'
    };

    driver = wd.remote('ondemand.saucelabs.com', 80, username, apiKey);
    driver.init(options, function() {
      console.log('SL initiated, getting', url + '?id=' + id);
      driver.get(url + '?id=' + id, heartbeat);
    });
  };

  this.start = function(url) {
    if (config.startConnect !== false) {
      sauceConnect.start(username, apiKey).then(function() {
        start(url);
      });
    } else {
      start(url);
    }
  };

  this.kill = function(done) {
    clearTimeout(pendingHeartBeat);
    driver.quit(done);
  };

  this.markCaptured = function() {
    captured = true;
  };

  this.isCaptured = function() {
    return captured;
  };
};


// PUBLISH DI MODULE
module.exports = {
  'sauceConnect': ['type', SauceConnect],
  'launcher:SauceLabs': ['type', SauceLabBrowser]
};
