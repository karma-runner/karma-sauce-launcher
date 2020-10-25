import {SauceLabsOptions} from 'saucelabs'
import {BrowserObject} from "webdriverio";

type SauceBaseOption = Pick<SauceLabsOptions, 'headless' | 'region'>

/**
 * This interface describes a browser that has been launched with Saucelabs. This is helpful
 * when reporting the results to the Saucelabs web API.
 */
export interface SaucelabsBrowser extends SauceBaseOption {
  /** Saucelabs session id of this browser. */
  sessionId: string;

  /** Saucelabs username that has been used to launch this browser. */
  username: string;

  /** Saucelabs access key that has been used to launch this browser. */
  accessKey: string;

  /** Saucelabs driver instance to communicate with this browser. */
  driver: BrowserObject
}

/** Type that describes the BrowserMap injection token. */
export type BrowserMap = Map<number, SaucelabsBrowser>;
