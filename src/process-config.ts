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
    build: config.build,
    commandTimeout: config.commandTimeout || 300,
    customData: config.customData || {},
    idleTimeout: config.idleTimeout || 90,
    maxDuration: config.maxDuration || 1800,
    name: config.testName || 'Saucelabs Launcher Tests',
    parentTunnel: config.parentTunnel,
    public: config.public || 'public',
    recordScreenshots: config.recordScreenshots,
    recordVideo: config.recordVideo,
    tags: config.tags || [],
    tunnelIdentifier: tunnelIdentifier,
    'custom-data': config.customData,
  };

  const sauceConnectOptions = {
    tunnelIdentifier: tunnelIdentifier,
    ...config.connectOptions,
  };

  // transform JWP capabilities into W3C capabilities for backward compatibility
  if (isW3C(args)) {
    args.browserVersion = args.browserVersion || args.version || 'latest'
    args.platformName = args.platformName || args.platform || 'Windows 10'
    args['sauce:options'] = args['sauce:options'] ? {...args['sauce:options'], ...capabilitiesFromConfig} : capabilitiesFromConfig

    // delete JWP capabilities
    delete args.version
    delete args.platform
  } else {
    args = {...args, ...capabilitiesFromConfig}
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
