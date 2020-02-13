import {Builder, WebDriver} from 'selenium-webdriver';
import {processConfig} from "../process-config";
import {BrowserMap} from "../browser-info";

export function SaucelabsLauncher(args,
                                  /* config.sauceLabs */ config,
                                  /* SauceConnect */ sauceConnect,
                                  browserMap: BrowserMap,
                                  logger,
                                  baseLauncherDecorator,
                                  captureTimeoutLauncherDecorator,
                                  retryLauncherDecorator) {

  // Apply base class mixins. This would be nice to have typed, but this is a low-priority now.
  baseLauncherDecorator(this);
  captureTimeoutLauncherDecorator(this);
  retryLauncherDecorator(this);

  const log = logger.create('SaucelabsLauncher');
  const {
    startConnect,
    sauceConnectOptions,
    sauceApiProxy,
    seleniumHostUrl,
    seleniumCapabilities,
    browserName,
    username,
    accessKey
  } = processConfig(config, args);

  // Array of connected drivers. This is useful for quitting all connected drivers on kill.
  let connectedDrivers: WebDriver[] = [];

  // number of pending cancellations for heartbeat functionality
  let pendingCancellations = 0;

  // Setup Browser name that will be printed out by Karma.
  this.name = browserName + ' on SauceLabs';

  let pendingHeartBeat; 
  const formatSauceError = (err) => {
    return err.message + '\n' + (err.data ? '  ' + err.data : '')
  }
  // Heartbeat function to keep alive sessions on Sauce Labs via webdriver JSON wire calls
  const heartbeat = () => {
    pendingHeartBeat = setTimeout( (driver) => {
      log.debug('Heartbeat to Sauce Labs (%s) - fetching title', browserName)

      driver.title()
        .then(null, (err) => {
          log.error('Heartbeat to %s failed\n  %s', browserName, formatSauceError(err))

          clearTimeout(pendingHeartBeat)
          return this._done('failure')
      });

      heartbeat()
      }, 60000);
}

  // Listen for the start event from Karma. I know, the API is a bit different to how you
  // would expect, but we need to follow this approach unless we want to spend more work
  // improving type safety.
  this.on('start', async (pageUrl: string) => {
    if (startConnect) {
      try {
        // In case the "startConnect" option has been enabled, establish a tunnel and wait
        // for it being ready. In case a tunnel is already active, this will just continue
        // without establishing a new one.
        await sauceConnect.establishTunnel(sauceConnectOptions);
      } catch (error) {
        log.error(error);

        this._done('failure');
        return;
      }
    }

    try {
      // See the following link for public API of the selenium server.
      // https://wiki.saucelabs.com/display/DOCS/Instant+Selenium+Node.js+Tests
      const driver = await new Builder()
        .withCapabilities(seleniumCapabilities)
        .usingServer(`http://${username}:${accessKey}@${seleniumHostUrl}`)
        .build();

      // Keep track of all connected drivers because it's possible that there are multiple
      // driver instances (e.g. when running with concurrency)
      connectedDrivers.push(driver);

      const sessionId = (await driver.getSession()).getId();

      log.info('%s session at https://saucelabs.com/tests/%s', browserName, sessionId);
      log.debug('Opening "%s" on the selenium client', pageUrl);

      // Store the information about the current session in the browserMap. This is necessary
      // because otherwise the Saucelabs reporter is not able to report results.
      browserMap.set(this.id, {sessionId, username, accessKey, proxy: sauceApiProxy});

      await driver.get(pageUrl);
      heartbeat();
    } catch (e) {
      // determine if there are still pending cancellations based on the heartbeat
      if (pendingCancellations > 0) {
        pendingCancellations--;
        return;
      }
      log.error(e);

      // Notify karma about the failure.
      this._done('failure');
    }
  });

  this.on('kill', async (doneFn: () => void) => {
    // If there is still pending heartbeats, clear the timeout
    if (pendingHeartBeat) {
      clearTimeout(pendingHeartBeat);
    }

    try {
      await Promise.all(connectedDrivers.map(driver => driver.quit()));
    } catch (e) {
      // We need to ignore the exception here because we want to make sure that Karma is still
      // able to retry connecting if Saucelabs itself terminated the session (and not Karma)
      // For example if the "idleTimeout" is exceeded and Saucelabs errored the session. See:
      // https://wiki.saucelabs.com/display/DOCS/Test+Didn%27t+See+a+New+Command+for+90+Seconds
      log.error('Could not quit the Saucelabs selenium connection. Failure message:');
      log.error(e);
    }

    // Reset connected drivers in case the launcher will be reused.
    connectedDrivers = [];

    doneFn();
  })
}
