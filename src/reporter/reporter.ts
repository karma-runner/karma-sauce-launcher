import {promisify} from 'util';
import {BrowserMap} from "../browser-info";

// This import lacks type definitions.
import SaucelabsAPI from 'saucelabs'

/**
 * Karma browser reported that updates corresponding Saucelabs jobs whenever a given
 * browser finishes.
 */
export function SaucelabsReporter(logger, browserMap: BrowserMap) {

  const log = logger.create('reporter.sauce');

  // This fires whenever any browser completes. This is when we want to report results
  // to the Saucelabs API, so that people can create coverage banners for their project.
  this.onBrowserComplete = function (browser) {
    const result = browser.lastResult;
    const browserId = browser.id;

    if (result.disconnected) {
      log.error('✖ Browser disconnected');
    }

    if (result.error) {
      log.error('✖ Tests errored');
    }

    const browserData = browserMap.get(browserId);

    // Do nothing if the current browser has not been launched through the Saucelabs
    // launcher.
    if (!browserData) {
      return;
    }

    const {accessKey: key, region, proxy, sessionId, username: user} = browserData;
    const apiInstance = new SaucelabsAPI({
          user,
          key,
          region,
          proxy
    });

    const updateJob = promisify(apiInstance.updateJob.bind(apiInstance));
    const hasPassed = !(result.failed || result.error || result.disconnected);

    // Update the job by reporting the test results. Also we need to store the promise here
    // because in case "onExit" is being called, we want to wait for the API calls to finish.
    updateJob(browserData.username, sessionId, {passed: hasPassed, 'custom-data': result})
      .catch(error => log.error('Could not report results to Saucelabs: %s', error));
  };

}
