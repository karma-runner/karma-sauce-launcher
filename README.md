# karma-sauce-launcher

> Run your unit tests on [Sauce Labs](https://saucelabs.com/)' browser cloud!

[![Build Status](https://travis-ci.org/karma-runner/karma-sauce-launcher.svg?branch=doc)](https://travis-ci.org/karma-runner/karma-sauce-launcher) [![david-dm-status-badge](https://david-dm.org/karma-runner/karma-sauce-launcher.png)](https://david-dm.org/karma-runner/karma-sauce-launcher#info=dependencies&view=table)
 [![david-dm-status-badge](https://david-dm.org/karma-runner/karma-sauce-launcher/dev-status.png)](https://david-dm.org/karma-runner/karma-sauce-launcher#info=devDependencies&view=table)

## Installation

Install `karma-sauce-launcher` as a `devDependency` in your package.json:

```bash
npm install karma-sauce-launcher --save-dev
```

## Usage

This launcher is typically used in CI to run your unit tests across many browsers on Sauce Labs. However, you can also use it locally to debug tests in browsers not available on your machine.

### Adding karma-sauce-launcher to an existing Karma config

To configure this launcher, you need to add two properties to your top-level Karma config, `sauceLabs` and `customLaunchers`, and set the `browsers` array to use Sauce Labs browsers.

The `sauceLabs` object defines global properties for each browser/OS while the `customLaunchers` object configures individual browsers. Here is a minimal Karma config to get the launcher running:

```js
module.exports = function(config) {
  // Example set of browsers to run on Sauce Labs
  // Check out https://saucelabs.com/platforms for all browser/OS combos
  var customLaunchers = {
    sl_chrome: {
      base: 'SauceLabs',
      browserName: 'chrome',
      platform: 'Windows 7'
    },
    sl_firefox: {
      base: 'SauceLabs',
      browserName: 'firefox',
      version: '27'
    },
    sl_safari: {
      base: 'SauceLabs',
      browserName: 'safari',
      platform: 'OS X 10.9',
      version: '7'
    },
    sl_ie_11: {
      base: 'SauceLabs',
      browserName: 'internet explorer',
      platform: 'Windows 8.1',
      version: '11'
    }
  };

  config.set({

    // The rest of your karma config is here
    // ...

    // This assumes process.env.SAUCE_USERNAME and
    // process.env.SAUCE_ACCESS_KEY are set
    sauceLabs: {
        testName: 'Web App Unit Tests'
    },
    customLaunchers: customLaunchers,
    browsers: Object.keys(customLaunchers),
    reporters: ['dots', 'saucelabs']
    singleRun: true
  });
};
```

**Note: this config assumes that `process.env.SAUCE_USERNAME` and `process.env.SAUCE_ACCESS_KEY` are set.**

### Example karma-sauce-launcher configs

For example configs using this launcher, check out the [examples directory](https://github.com/karma-runner/karma-sauce-launcher/tree/master/examples) in this project(which uses Travis CI), the [karma-sauce-example repo](https://github.com/saucelabs/sauce-karma-example), or [AngularJS' Karma config](https://github.com/angular/angular.js/blob/master/karma-shared.conf.js).

### Reporter

Add the `saucelabs` reporter to report the pass/fail status of the build back to SauceLabs. The full results
are reported in the *Metadata -> custom data* section on SauceLabs.

## `sauceLabs` config properties shared across all browsers

### username
Type: `String`
Default: `process.env.SAUCE_USERNAME`

Your Sauce Labs username (if you don't have an account, you can sign up [here](https://saucelabs.com/signup/plan/free)).

### accessKey
Type: `String`
Default: `process.env.SAUCE_ACCESS_KEY`

Your Sauce Labs access key which you will see on your [account page](https://saucelabs.com/account  ).

### startConnect
Type: `Boolean`
Default: `true`

If `true`, Sauce Connect will be started automatically. Set this to `false` if you are launching tests locally and want to start Sauce Connect via [a binary](https://saucelabs.com/docs/connect) or the [Mac](https://saucelabs.com/mac) app in the background to improve test speed.

### tunnelIdentifier
Type: `String`

Sauce Connect can proxy multiple sessions, this is an id of a session.

### tags
Type: `Array of Strings`

Tags to use for filtering jobs in your Sauce Labs account.

### build
Type: `String`

Id of the build currently running. This should come from your CI.

### testName
Type: `String`

Name of the unit test group you are running.

### recordVideo
Type: `Boolean`
Default: `false`

Set to true if you want to record a video of your Karma session.

### recordScreenshots
Type: `Boolean`
Default: `true`

Set to false if you don't want to record screenshots.

## `customLaunchers` config properties

The `customLaunchers` object has browser names as keys and configs as values. Documented below are the dif

*Note: You can learn about the available browser/platform combos on the [Sauce Labs platforms page](https://saucelabs.com/platforms).*

### base
Type: `String`
Required: `true`
This defines the base configuration for the launcher, in this case it should always be `SauceLabs` so that browsers can use the base Sauce Labs config.

### browserName
Type: `String`
Required: `true`

Name of the browser.

### version
Type: `String`
Version of the browser to use.

### platform
Type: `String`

Name of platform to run browser on.

### deviceOrientation
Type: `String`
Accepted values: `'portrait' || 'landscape'`
>>>>>>> docs: common use cases

Set this string if you want your unit tests need to run on a particular mobile device orientation .

For more information on Karma see the [homepage](http://karma-runner.github.com).
