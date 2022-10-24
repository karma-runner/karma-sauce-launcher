import {bootstrap} from 'global-agent'
import {isW3C} from "./utils";

export function processConfig(config: any = {}, args: any = {}) {
  const username = config.username || process.env.SAUCE_USERNAME;
  const accessKey = config.accessKey || process.env.SAUCE_ACCESS_KEY;
  const startConnect = config.startConnect !== false;

  let tunnelIdentifier = args.tunnelIdentifier || config.tunnelIdentifier;

  // TODO: This option is very ambiguous because it technically only affects the reporter. Consider
  // renaming in the future.
  const sauceApiProxy = args.proxy || config.proxy;
  if (sauceApiProxy) {
    const envVar = sauceApiProxy.startsWith('https') ? 'KARMA_HTTPS_PROXY' : 'KARMA_HTTP_PROXY'
    process.env[envVar] = sauceApiProxy
    bootstrap({
      environmentVariableNamespace: 'KARMA_',
      forceGlobalAgent: false
    })
  }

  // Browser name that will be printed out by Karma.
  const browserName = `${args.browserName} ${args.browserVersion || args.version || ''} ${args.platformName || args.platform || ''}`;

  // In case "startConnect" is enabled, and no tunnel identifier has been specified, we just
  // generate one randomly. This makes it possible for developers to use "startConnect" with
  // zero setup.
  if (!tunnelIdentifier && startConnect) {
    tunnelIdentifier = 'karma-sauce-' + Math.round(new Date().getTime() / 1000);
  }

  const capabilitiesFromConfig = {
    // Test annotation
    build: config.build || args.build,
    name: config.testName || args.testName || 'Saucelabs Launcher Tests',
    tags: config.tags || args.tags || [],
    'custom-data': config.customData || args.customData,
    customData: config.customData || args.customData || {},
    // Timeouts
    maxDuration: config.maxDuration || 1800,
    commandTimeout: config.commandTimeout || 300,
    idleTimeout: config.idleTimeout || 90,
    // Custom Testing Options
    parentTunnel: config.parentTunnel,
    tunnelIdentifier: tunnelIdentifier,
    timeZone: config.timeZone || args.timeZone,
    public: config.public || 'public',
    // Optional Testing Features
    recordScreenshots: config.recordScreenshots || args.recordScreenshots,
    recordVideo: config.recordVideo || config.recordVideo,
  };

  const sauceConnectOptions = {
    tunnelIdentifier: tunnelIdentifier,
    ...config.connectOptions,
  };

  // transform JWP capabilities into W3C capabilities for backward compatibility
  // NOTE: IE9 is the only browser/version that supports **only** JWT.
  const isIE9 = (args.browserName.toLowerCase() === 'internet explorer') && (args.version === '9');
  if (!isW3C(args) && !isIE9) {
    args.browserVersion = args.browserVersion || args.version || 'latest'
    args.platformName = args.platformName || args.platform || 'Windows 10'

    // delete JWP capabilities
    delete args.version
    delete args.platform
  }

  // Move Sauce-specific options to the appropriate place inside capabilities.
  // See: https://docs.saucelabs.com/dev/w3c-webdriver-capabilities/index.html#use-sauceoptions
  if (isIE9) {
    // In JWT format (which IE9 has to use), Sauce-specific options need to be added to the
    // top-level capabilities.
    args = {...args, ...capabilitiesFromConfig}
  } else {
    // In W3C format, Sauce-specific options need to be put inside `sauce:options`.
    args['sauce:options'] = {...capabilitiesFromConfig, ...(args['sauce:options'] || {})}
  }

  // Not needed
  delete args.base

  const seleniumCapabilities = {
    user: username,
    key: accessKey,
    region: config.region,
    headless: config.headless,
    logLevel: 'error',
    capabilities: {
      ...args
    },
    ...config.options
  };

  return {
    startConnect,
    sauceConnectOptions,
    seleniumCapabilities,
    browserName
  }
}
