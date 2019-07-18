/**
 * This interface describes a browser that has been launched with Saucelabs. This is helpful
 * when reporting the results to the Saucelabs web API.
 */
export interface SaucelabsBrowser {
  /** Saucelabs session id of this browser. */
  sessionId: string;

  /** Saucelabs username that has been used to launch this browser. */
  username: string;

  /** Saucelabs access key that has been used to launch this browser. */
  accessKey: string;

  /** Saucelabs datacenter region that is targeted for this session. */
  region: string;

  /** Proxy URL that will be used to make an API call to the Saucelabs API. */
  proxy: string;
}

/** Type that describes the BrowserMap injection token. */
export type BrowserMap = Map<number, SaucelabsBrowser>;
