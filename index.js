// TODO(vojta):
// - add concrete browsers
// - more config (+ global config)

var q = require('q');
var wd = require('wd');
var launchSauceConnect = require('sauce-connect-launcher');

// SauceLabs is a wrapper around the Sauce Labs REST API
var SauceLabs = require('saucelabs');

// We keep a mapping from Karma launch IDs to Sauce job IDs here, to report the pass/fail results.
// We also keep the Sauce credentials here - theoretically different credentials can be used for
// different browsers in the same session.
var jobMapping = {};

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
      if (err) {
        return alreadyRunningDefered.reject(err);
      }

      alreadyRunningProces = p;
      alreadyRunningDefered.resolve();
    });

    return alreadyRunningDefered.promise;
  };

  emitter.on('exit', function(done) {
    if (alreadyRunningProces) {
      log.info('Shutting down Sauce Connect');
      alreadyRunningProces.close(done);
      alreadyRunningProces = null;
    } else {
      done();
    }
  });
};


var SauceLabsBrowser = function(args, sauceConnect, /* config.sauceLabs */ config, logger, helper,
    baseLauncherDecorator, captureTimeoutLauncherDecorator, retryLauncherDecorator) {

  baseLauncherDecorator(this);
  captureTimeoutLauncherDecorator(this);
  retryLauncherDecorator(this);

  config = config || {};

  var username = process.env.SAUCE_USERNAME || args.username || config.username;
  var accessKey = process.env.SAUCE_ACCESS_KEY || args.accessKey || config.accessKey;
  var tunnelIdentifier = args.tunnelIdentifier || config.tunnelIdentifier;
  var browserName = args.browserName + (args.version ? ' ' + args.version : '') +
                    (args.platform ? ' (' + args.platform + ')' : '');
  var startConnect = config.startConnect !== false;
  var log = logger.create('launcher.sauce');

  var self = this;
  var driver = wd.remote('ondemand.saucelabs.com', 80, username, accessKey);

  var pendingCancellations = 0;
  var sessionIsReady = false;

  if (startConnect && !tunnelIdentifier) {
    tunnelIdentifier = 'karma' + Math.round(new Date().getTime() / 1000);
  }

  this.name = browserName + ' on SauceLabs';

  var pendingHeartBeat;
  var heartbeat = function() {
    pendingHeartBeat = setTimeout(function() {
      log.debug('Heartbeat to Sauce Labs (%s) - fetching title', browserName);
      driver.title();
      heartbeat();
    }, 60000);
  };

  var formatSauceError = function(err) {
    return err.message + '\n  ' + err.data.split('\n').shift();
  };

  var start = function(url) {
    var options = helper.merge(config.options, args, {
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
              process.env.CIRCLE_BUILD_NUM || null,
      'device-orientation': args.deviceOrientation || null
    });

    // Adding any other option that was specified in args, but not consumed from above
    // Useful for supplying chromeOptions, firefoxProfile, etc.
    for (var key in args){
      if (typeof options[key] === 'undefined') {
        options[key] = args[key];
      }
    }

    driver.init(options, function(err, jobId) {
      if (pendingCancellations > 0) {
        pendingCancellations--;
        return;
      }

      if (err) {
        log.error('Can not start %s\n  %s', browserName, formatSauceError(err));
        return self._done('failure');
      }

      // Record the job details, so we can access it later with the reporter
      jobMapping[self.id] = {
        jobId: jobId,
        credentials: {
          username: username,
          password: accessKey
        }
      };

      sessionIsReady = true;

      log.info('%s session at https://saucelabs.com/tests/%s', browserName, driver.sessionID);
      log.debug('WebDriver channel for %s instantiated, opening %s', browserName, url);
      driver.get(url, heartbeat);
    });
  };

  this.on('start', function(url) {
    if (pendingCancellations > 0) {
      pendingCancellations--;
      return;
    }

    if (startConnect) {
      sauceConnect.start(username, accessKey, tunnelIdentifier).then(function() {
        if (pendingCancellations > 0) {
          pendingCancellations--;
          return;
        }

        start(url);
      }, function(err) {
        pendingCancellations--;
        log.error('Can not start %s\n  Failed to start Sauce Connect:\n  %s', browserName, err.message);
        self._retryLimit = -1; // don't retry
        self._done('failure');
      });
    } else {
      start(url);
    }
  });

  this.on('kill', function(done) {
    var allDone = function() {
      self._done();
      done();
    };

    if (sessionIsReady) {
      if (pendingHeartBeat) {
        clearTimeout(pendingHeartBeat);
      }

      log.debug('Shutting down the %s driver', browserName);
      // workaround - navigate to other page to avoid re-connection
      driver.get('about:blank', function() {
        driver.quit(allDone);
      });

      sessionIsReady = false;
    } else {
      pendingCancellations++;
      process.nextTick(allDone);
    }
  });
};

var SauceLabsReporter = function(baseReporterDecorator, emitter, logger) {
  var log = logger.create('reporter.sauce');

  baseReporterDecorator(this);

  var pendingUpdates = 0;
  var updatesFinished = function() {};

  // We're only interested in the final results per browser
  this.onBrowserComplete = function(browser) {
    var result = browser.lastResult;

    // browser.launchId was used until v0.10.2, but changed to just browser.id in v0.11.0
    var browserId = browser.launchId || browser.id;

    if(browserId in jobMapping) {
      var jobDetails = jobMapping[browserId];

      var sauceApi = new SauceLabs(jobDetails.credentials);

      // We record pass/fail status, as well as the full results in "custom-data".
      var payload = {
        passed: !(result.failed || result.error),
        'custom-data': result
      };

      pendingUpdates++;

      sauceApi.updateJob(jobDetails.jobId, payload, function(err) {
        pendingUpdates--;
        if (err) {
          log.error('Failed record pass/fail status: %s', err.error);
        }

        if (pendingUpdates == 0) {
          updatesFinished();
        }
      });
    }
  };

  // Wait until all updates have been pushed to SauceLabs
  emitter.on('exit', function(done) {
    if (pendingUpdates) {
      updatesFinished = done;
    } else {
      done();
    }
  });
};

SauceLabsReporter.$inject = ['baseReporterDecorator', 'emitter', 'logger'];

// PUBLISH DI MODULE
module.exports = {
  'sauceConnect': ['type', SauceConnect],
  'launcher:SauceLabs': ['type', SauceLabsBrowser],
  'reporter:saucelabs': ['type', SauceLabsReporter]
};
