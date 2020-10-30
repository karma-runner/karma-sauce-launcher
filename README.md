# karma-sauce-launcher

[![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat-square)](https://github.com/karma-runner/karma-sauce-launcher)
[![npm version](https://img.shields.io/npm/v/karma-sauce-launcher.svg?style=flat-square)](https://www.npmjs.com/package/karma-sauce-launcher) [![npm downloads](https://img.shields.io/npm/dm/karma-sauce-launcher.svg?style=flat-square)](https://www.npmjs.com/package/karma-sauce-launcher)
[![semantic-release](https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg)](https://github.com/semantic-release/semantic-release)

[![Build Status](https://img.shields.io/travis/karma-runner/karma-sauce-launcher/master.svg?style=flat-square)](https://travis-ci.org/karma-runner/karma-sauce-launcher) [![Dependency Status](https://img.shields.io/david/karma-runner/karma-sauce-launcher.svg?style=flat-square)](https://david-dm.org/karma-runner/karma-sauce-launcher) [![devDependency Status](https://img.shields.io/david/dev/karma-runner/karma-sauce-launcher.svg?style=flat-square)](https://david-dm.org/karma-runner/karma-sauce-launcher#info=devDependencies)


![Karma Plus Sauce](/images/karma-plus-sauce.png)

> Run your unit tests on [Sauce Labs](https://saucelabs.com/)' browser cloud!


## Installation

Install `karma-sauce-launcher` as a `devDependency` in your package.json:

```bash
npm install karma-sauce-launcher --save-dev
```

## Usage

This launcher is typically used in CI to run your unit tests across many browsers and platforms on Sauce Labs. However, you can also use it locally to debug tests in browsers not available on your machine. It is expected that you are already familiar with Karma when configuring this launcher, so if you are new to Karma, head over to the [Karma website](http://karma-runner.github.io/).

The [Sauce Labs platform configurator](https://wiki.saucelabs.com/display/DOCS/Platform+Configurator/#/) can help to find the correct configuration for your desired test platform.

### Adding karma-sauce-launcher to an existing Karma config

To configure this launcher, you need to add two properties to your top-level Karma config, `sauceLabs` and `customLaunchers`, set the `browsers` array to use Sauce Labs browsers, and add the `sauceLabs` reporter.

The `sauceLabs` object defines global properties for each browser/platform while the `customLaunchers` object configures individual browsers. The `sauceLabs` reporter allows your tests results to be properly displayed on https://saucelabs.com. Here is a sample Karma config to get the launcher running:

```js
module.exports = function(config) {
  // Example set of browsers to run on Sauce Labs
  // Check out https://saucelabs.com/platforms for all browser/platform combos
  var customLaunchers = {
    // Old JSONWP way of setting the capabilities
    sl_chrome: {
      base: 'SauceLabs',
      browserName: 'chrome',
      platform: 'Windows 10',
    },
    sl_firefox: {
      base: 'SauceLabs',
      browserName: 'firefox',
      version: 'latest'
    },
    sl_ie_11: {
      base: 'SauceLabs',
      browserName: 'internet explorer',
      platform: 'Windows 8.1',
    },
    // Mobile settings
    // 1. Go to https://wiki.saucelabs.com/display/DOCS/Platform+Configurator#/
    // 2. Select Appium iOS,Android
    // 3. Configure your device
    //    Don't forget to provide the `appiumVersion`
    sl_ios_safari: {
      base: 'SauceLabs',
      deviceName: 'iPhone 11 Simulator',
      platformVersion: '13.4',
      platformName: 'iOS',
      browserName: 'Safari',
      appiumVersion: '1.17.1',
      deviceOrientation: 'portrait'
    },
    // !!!!IMPORTANT!!!!
    // If you want to use an Android emulator then you can't use localhost.
    // Because an Android emulator is a VM it will go to it's own localhost
    // and the test will fail. Make change the `hostname` to your
    // local ip
    sl_android: {
      base: 'SauceLabs',
      deviceName: 'Android GoogleAPI Emulator',
      platform: 'Android',
      version: '11.0',
      browserName: 'chrome',
      appiumVersion: '1.18.1',
      deviceOrientation: 'portrait'
    },
    // For W3C way of setting the capabilities check
    // https://wiki.saucelabs.com/display/DOCS/Platform+Configurator#/
    // And select WebDriver (W3C) Selenium 3/4, Webdriver.io
    sl_chromeW3C: {
      base: 'SauceLabs',
      browserName: 'chrome',
      browserVersion: 'latest',
      'sauce:options':{
        tags: ['w3c-chrome']
      }
    },
  }

  config.set({

    // The rest of your karma config is here
    // ...
    sauceLabs: {
        testName: 'Web App Unit Tests'
    },
    customLaunchers: customLaunchers,
    browsers: Object.keys(customLaunchers),
    reporters: ['dots', 'saucelabs'],
    singleRun: true
  })
}
```

**Note: this config assumes that `process.env.SAUCE_USERNAME` and `process.env.SAUCE_ACCESS_KEY` are set.**

### Example karma-sauce-launcher configs

For example configs using this launcher (using Travis CI), check out this repo's [karma file](https://github.com/karma-runner/karma-sauce-launcher/tree/master/examples/karma.conf-ci.js), or [AngularJS' Karma config](https://github.com/angular/angular.js/blob/master/karma-shared.conf.js).

### Example results in Sauce Labs
Version `4.2.0` and lower of this module will give you the following result in Sauce Labs, no matter how many tests you execute.

![Sauce Logs](/images/saucelabs-old.png)

As of version [4.3.0](https://github.com/karma-runner/karma-sauce-launcher/releases/tag/v4.3.0) the logs are replaced with the
test names and results of the individual tests that have been executed on Sauce Labs, including the execution url in the logs.

**Successful run**
![Sauce Successful Logs](/images/new-sauce-logs-success.png)

**Unsuccessful run**
![Sauce Successful Logs](/images/new-sauce-logs-failure.png)

**Execution url**
![Sauce Successful Logs](/images/sauce-execution-url.png)

## `sauceLabs` config properties shared across all browsers

### username
Type: `String`
Default: `process.env.SAUCE_USERNAME`

Your Sauce Labs username (if you don't have an account, you can sign up [here](https://saucelabs.com/signup/plan/free)).

### accessKey
Type: `String`
Default: `process.env.SAUCE_ACCESS_KEY`

Your Sauce Labs access key which you will see on your [account page](https://saucelabs.com/account).

### region
Type: `String`

Detect datacenter to run tests in. Can be either `eu` or `us`.

### headless
Type: `Boolean`

If set to `true` tests are being run on Sauce Labs headless platform on `us-east-1`. This option will be ignored if `region` is set.

### proxy
Type: `String`

Proxy for connecting to Sauce REST API, which is used to communicate job updates of pass/fail.

### startConnect
Type: `Boolean`
Default: `true`

If `true`, Sauce Connect will be started automatically.
Set this to `false` if you are launching tests locally but want to start Sauce Connect via [a binary](https://wiki.saucelabs.com/display/DOCS/Downloading+Sauce+Connect+Proxy) manually in the background to improve test speed.

### connectOptions
Type: `Object`
Default:
```js
{
  username: 'yourUsername',
  accessKey: 'yourAccessKey',
  tunnelIdentifier: 'autoGeneratedTunnelID'
}
```

Options to send to Sauce Connect.

Check [here](https://wiki.saucelabs.com/display/DOCS/Sauce+Connect+Proxy+Command-Line+Quick+Reference+Guide) for all available options.
All parameters have to be applied camel cased instead of with hyphens.

### build
Type: `String`
Default: *One of the following environment variables*:
`process.env.BUILD_NUMBER`
`process.env.BUILD_TAG`
`process.env.CI_BUILD_NUMBER`
`process.env.CI_BUILD_TAG`
`process.env.TRAVIS_BUILD_NUMBER`
`process.env.CIRCLE_BUILD_NUM`
`process.env.DRONE_BUILD_NUMBER`

ID of the build currently running. This should be set by your CI.

### testName
Type: `String`
Default: `'Karma test'`

Name of the unit test group you are running.

### tunnelIdentifier
Type: `String`

Sauce Connect can proxy multiple sessions, this is an id of a session.

### tags
Type: `Array of Strings`

Tags to use for filtering jobs in your Sauce Labs account.

### recordVideo
Type: `Boolean`
Default: `false`

Set to `true` if you want to record a video of your Karma session.

### recordScreenshots
Type: `Boolean`
Default: `true`

Set to `false` if you don't want to record screenshots.

### public
Type: `String`
Default: `null`

Control who can view job details. Available visibility levels are documented on
the [SauceLabs website](https://wiki.saucelabs.com/display/DOCS/Test+Configuration+Options#TestConfigurationOptions-JobVisibility).

### customData
Type: `Object`
Default: `{}`

Send arbitrary data alongside your tests. See
the [SauceLabs documentation](https://wiki.saucelabs.com/display/DOCS/Test+Configuration+Options#TestConfigurationOptions-CustomData)
for more details.


## `customLaunchers` config properties

The `customLaunchers` object has browser names as keys and configs as values. Documented below are the different properties which you can configure for each browser/platform combo.

*Note: You can learn about the available browser/platform combos on the [Sauce Labs platforms page](https://saucelabs.com/platforms), [platforms configurator page](https://docs.saucelabs.com/reference/platforms-configurator/#/) and [REST API page](https://docs.saucelabs.com/reference/rest-api/#get-supported-platforms).*

### base
Type: `String`
Required: `true`

This defines the base configuration for the launcher. In this case it should always be `SauceLabs` so that browsers can use the base Sauce Labs config defined at the root `sauceLabs` property.

### browserName
Type: `String`
Required: `true`

Name of the browser.

### browserVersion
Type: `String`
Default: Latest browser version for all browsers except Chrome

Version of the browser to use.

### platformName
Type: `String`
Default: `'Linux'` for Firefox/Chrome, `'Windows 7'` for IE/Safari

Name of platform to run browser on.

### `sauce:options`

Specific Sauce Labs capability [options](https://wiki.saucelabs.com/display/DOCS/Test+Configuration+Options).

## Behind the scenes

This launcher uses Sauce Connect in the background. If you are interested in security or want to see the system requirements, head over to the [documentation](https://wiki.saucelabs.com/display/DOCS/Getting+Started+with+Sauce+Connect+Proxy).
