import SaucelabsAPI, {SauceConnectInstance} from 'saucelabs';

const MAX_SC_START_TRIALS = 3

/**
 * Service that can be used to create a SauceConnect tunnel automatically. This can be used
 * in case developers don't set up the tunnel using the plain SauceConnect binaries.
 */
export function SauceConnect(emitter, logger) {
  const log = logger.create('launcher.SauceConnect');

  // Currently active tunnel instance. See: https://github.com/saucelabs/node-saucelabs
  // for public API.
  let activeInstancePromise: Promise<any> = null;

  let scStartTrials = 0
  this.establishTunnel = async (seleniumCapabilities, sauceConnectOptions: any) => {
    // In case there is already a promise for a SauceConnect tunnel, we still need to return the
    // promise because we want to make sure that the launcher can wait in case the tunnel is
    // still starting.
    if (activeInstancePromise) {
      return activeInstancePromise;
    }

    // Open a new SauceConnect tunnel.
    const api = new SaucelabsAPI(seleniumCapabilities)
    return activeInstancePromise = api.startSauceConnect({
        // Redirect all logging output to Karma's logger.
        logger: log.debug.bind(log),
        ...sauceConnectOptions
    }).catch((err) => {
      ++scStartTrials

      /**
       * fail starting Sauce Connect eventually
       */
      if (scStartTrials >= MAX_SC_START_TRIALS) {
        throw err
      }

      log.debug(`Failed to start Sauce Connect Proxy due to ${err.stack}`)
      log.debug(`Retrying ${scStartTrials}/${MAX_SC_START_TRIALS}`)
      return this.establishTunnel(seleniumCapabilities, sauceConnectOptions)
    });
  };

  // Close the tunnel whenever Karma emits the "exit" event. In that case, we don't need to
  // reset the state because Karma will exit completely.
  emitter.on('exit', async (doneFn: () => void) => {
    if (activeInstancePromise) {
      log.debug('Shutting down Sauce Connect');

      // shut down Sauce Connect once all session have been terminated
      try {
        const tunnelInstance:SauceConnectInstance = await activeInstancePromise
        await tunnelInstance.close()
      } catch (err) {
        log.error(`Could not close Sauce Connect Tunnel. Failure message: ${err.stack}`);
      }
    }
    
    doneFn();
  })
}