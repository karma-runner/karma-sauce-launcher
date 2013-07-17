// TODO(vojta):
// - add concrete browsers
// - more config (+ global config)

var q = require('q');
var wd = require('wd');
var launchSauceConnect = require('sauce-connect-launcher');


var SauceConnect = function(emitter, logger) {
  var log = logger.create('launcher.sauce');
  var alreadyRunningDefered;
  var alreadyRunningProces;

  this.start = function(username, accessKey, tunnelIdentifier, done) {
    var options = {
      username: username,
      accessKey: accessKey,
      verbose: false,
      logfile: null,
      logger: log.debug.bind(log),
      no_progress: false,
      tunnelIdentifier: tunnelIdentifier
    };

    // TODO(vojta): if different username/accessKey, start a new process
    if (alreadyRunningDefered) {
      log.debug('Sauce Connect is already running or starting');
      return alreadyRunningDefered.promise;
    }

    alreadyRunningDefered = q.defer();
    launchSauceConnect(options, function(err, p) {
      alreadyRunningProces = p;
      alreadyRunningDefered.resolve();
    });

    return alreadyRunningDefered.promise;
  };

  emitter.on('exit', function(done) {
    if (alreadyRunningProces) {
      log.info('Shutting down Sauce Connect');
      alreadyRunningProces.close(done);
    } else {
      done();
    }
  });
};


var SauceLabsBrowser = function(id, args, sauceConnect, /* config.sauceLabs */ config, logger, emitter) {
  config = config || {};

  var username = process.env.SAUCE_USERNAME || args.username || config.username;
  var accessKey = process.env.SAUCE_ACCESS_KEY || args.accessKey || config.accessKey;
  var tunnelIdentifier = args.tunnelIdentifier || config.tunnelIdentifier;
  var browserName = args.browserName + (args.version ? ' ' + args.version : '') +
                    (args.platform ? ' (' + args.platform + ')' : '') + ' on SauceLabs';
  var startConnect = config.startConnect !== false;
  var log = logger.create('launcher.sauce');

  var self = this;
  var driver;
  var captured = false;

  if (startConnect && !tunnelIdentifier) {
    tunnelIdentifier = 'karma' + Math.round(new Date().getTime() / 1000);
  }

  this.id = id;
  this.name = browserName;

  var pendingHeartBeat;
  var heartbeat = function() {
    pendingHeartBeat = setTimeout(function() {
      log.debug('Heartbeat to Sauce Labs - fetching title');
      driver.title();
      heartbeat();
    }, 60000);
  };

  var formatSauceError = function(err) {
    return err.message + '\n  ' + err.data.split('\n').shift();
  };

  var start = function(url) {
    var options = {
      browserName: args.browserName,
      version: args.version || '',
      platform: args.platform || 'ANY',
      tags: args.tags || config.tags || [],
      name: args.testName || config.testName || 'Karma test',
      'tunnel-identifier': tunnelIdentifier,
      'record-video': args.recordVideo || config.recordVideo || false,
      'record-screenshots': args.recordScreenshots || config.recordScreenshots || true,
      'build': args.build || config.build || process.env.TRAVIS_BUILD_NUMBER ||
              process.env.BUILD_NUMBER || process.env.BUILD_TAG ||
              process.env.CIRCLE_BUILD_NUM || null

    };

    url = url + '?id=' + id;

    driver = wd.remote('ondemand.saucelabs.com', 80, username, accessKey);
    driver.init(options, function(err) {
      if (err) {
        log.error('Can not start %s\n  %s', browserName, formatSauceError(err));
        return emitter.emit('browser_process_failure', self);
      }

      log.debug('WebDriver channel instantiated, opening ' + url);
      driver.get(url, heartbeat);
    });
  };

  this.start = function(url) {
    if (startConnect) {
      sauceConnect.start(username, accessKey, tunnelIdentifier).then(function() {
        start(url);
      });
    } else {
      start(url);
    }
  };

  this.kill = function(done) {
    if (!driver) {
      return;
    }

    clearTimeout(pendingHeartBeat);
    log.debug('Shutting down Sauce Labs driver');
    // workaround - navigate to other page to avoid re-connection
    driver.get('about:blank', function() {
      driver.quit(done);
    });
  };

  this.markCaptured = function() {
    captured = true;
  };

  this.isCaptured = function() {
    return captured;
  };

  this.toString = function() {
    return this.name;
  };
};


// PUBLISH DI MODULE
module.exports = {
  'sauceConnect': ['type', SauceConnect],
  'launcher:SauceLabs': ['type', SauceLabsBrowser]
};
