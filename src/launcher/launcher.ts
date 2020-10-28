import {remote, BrowserObject} from 'webdriverio';
import SauceLabs from 'saucelabs';
import {mkdirSync, removeSync, writeFileSync} from 'fs-extra';
import {processConfig} from "../process-config";
import {BrowserMap} from "../browser-info";

// Array of connected drivers. This is useful for quitting all connected drivers on kill.
let connectedDrivers: Map<string, BrowserObject> = new Map();

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

  // initiate driver with null to not close the tunnel too early
  connectedDrivers.set(this.id, null)

  const log = logger.create('SaucelabsLauncher');
  const {
    startConnect,
    sauceConnectOptions,
    seleniumCapabilities,
    browserName
  } = processConfig(config, args);

  // Setup Browser name that will be printed out by Karma.
  this.name = browserName + ' on SauceLabs';

  // Listen for the start event from Karma. I know, the API is a bit different to how you
  // would expect, but we need to follow this approach unless we want to spend more work
  // improving type safety.
  this.on('start', async (pageUrl: string) => {
    if (startConnect) {
      try {
        // In case the "startConnect" option has been enabled, establish a tunnel and wait
        // for it being ready. In case a tunnel is already active, this will just continue
        // without establishing a new one.
        await sauceConnect.establishTunnel(seleniumCapabilities, sauceConnectOptions);
      } catch (error) {
        log.error(error);

        this._done('failure');
        return;
      }
    }

    try {
      // See the following link for public API of the selenium server.
      // https://wiki.saucelabs.com/display/DOCS/Instant+Selenium+Node.js+Tests
      const driver = await remote(seleniumCapabilities);

      // Keep track of all connected drivers because it's possible that there are multiple
      // driver instances (e.g. when running with concurrency)
      connectedDrivers.set(this.id, driver);

      const sessionId = driver.sessionId

      log.info('%s session at https://saucelabs.com/tests/%s', browserName, sessionId);
      log.debug('Opening "%s" on the selenium client', pageUrl);

      // Store the information about the current session in the browserMap. This is necessary
      // because otherwise the Saucelabs reporter is not able to report results.
      browserMap.set(this.id, {
        sessionId,
        username: seleniumCapabilities.user,
        accessKey: seleniumCapabilities.key,
        region: seleniumCapabilities.region,
        headless: seleniumCapabilities.headless,
        results: [],
      });

      await driver.url(pageUrl);
    } catch (e) {
      log.error(e);

      // Notify karma about the failure.
      this._done('failure');
    }
  });

  this.on('kill', async (done: () => void) => {
    try {
      const driver = connectedDrivers.get(this.id);
      const {sessionId} = driver;
      await driver.deleteSession();

      const browserData = browserMap.get(this.id);
      const api = new SauceLabs({
        user: browserData.username,
        key: browserData.accessKey,
        region: browserData.region,
      });

      // Wait until the vm is destroyed and the assets are stored
      await new Promise(resolve => setTimeout(() => resolve(), 5000));
      // Create a tmp dir
      mkdirSync(sessionId);
      writeFileSync(`${sessionId}/log.json`, JSON.stringify(browserData.results, null, 2));
      // Update the log assets
      // @ts-ignore
      await api.uploadJobAssets(
        sessionId,
        {files: [`${sessionId}/log.json`]},
      );
      // remove the temporary folder
      removeSync(sessionId);

    } catch (e) {
      // We need to ignore the exception here because we want to make sure that Karma is still
      // able to retry connecting if Saucelabs itself terminated the session (and not Karma)
      // For example if the "idleTimeout" is exceeded and Saucelabs errored the session. See:
      // https://wiki.saucelabs.com/display/DOCS/Test+Didn%27t+See+a+New+Command+for+90+Seconds
      log.error('Could not quit the Saucelabs selenium connection. Failure message:');
      log.error(e);
    }

    connectedDrivers.delete(this.id)
    return process.nextTick(done);
  })
}
