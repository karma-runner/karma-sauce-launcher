import {promisify} from 'util';

// This import lacks type definitions.
const launchSauceConnect = promisify(require('sauce-connect-launcher'));

/**
 * Service that can be used to create a SauceConnect tunnel automatically. This can be used
 * in case developers don't set up the tunnel using the plain SauceConnect binaries.
 */
export function SauceConnect(emitter, logger) {
  const log = logger.create('launcher.SauceConnect');

  // Currently active tunnel instance. See: https://github.com/bermi/sauce-connect-launcher
  // for public API.
  let activeInstancePromise: Promise<any> = null;

  this.establishTunnel = async (connectOptions: any) => {
    // Redirect all logging output to Karma's logger.
    connectOptions.logger = log.debug.bind(log);

    // In case there is already a promise for a SauceConnect tunnel, we still need to return the
    // promise because we want to make sure that the launcher can wait in case the tunnel is
    // still starting.
    if (activeInstancePromise) {
      return activeInstancePromise;
    }

    // Open a new SauceConnect tunnel.
    return activeInstancePromise = launchSauceConnect(connectOptions);
  };

  // Close the tunnel whenever Karma emits the "exit" event. In that case, we don't need to
  // reset the state because Karma will exit completely.
  emitter.on('exit', (doneFn: () => void) => {
    if (activeInstancePromise) {
      log.debug('Shutting down Sauce Connect');

      // Close the tunnel and notify Karma once the tunnel has been exited.
      activeInstancePromise
        .then(instance => instance.close(doneFn()))
        .catch(() => doneFn())
    } else {
      doneFn();
    }
  })
}
