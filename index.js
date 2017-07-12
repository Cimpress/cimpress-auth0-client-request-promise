const _ = require('lodash');
const request = require('request-promise');
const Promise = require('bluebird');
const cache = require('./src/cache');
const passedInAuth = require('./src/passedInAuth');
const re = require('./src/requestEmitter');

// TODO: get from options? Or setup config
let logger = console.log;

/**
 * Return a request.js instance that wraps a custom request builder responsible for authenticating
 * all calls with an OAuth Bearer token from Auth0, whether retrieved via a client credentials grant
 * flow (preferred) or via delegation.
 */
module.exports = (() => {
  // TODO: pull outside
  const requestBuilder = (passedInOptions) => {
    // TODO: can set other defaults here that can be overriden by assign!
    const defaultOptions = {
      method: 'GET',
    };
    const options = _.assign(defaultOptions, passedInOptions);

    cache.setKeyGenFunc(options);
    options.uri = options.url || options.uri;

    const delay = ms => new Promise((resolve) => {
      setTimeout(resolve, ms);
    });

    // pull out after requestBuilder
    const retryLoop = (error) => {
      if (options.timesToRetry === undefined
        || options.timesToRetry === null
        || options.timesToRetry > 0) {
        if (options.timesToRetry) {
          options.timesToRetry -= 1;
        }

        // Look for a retryAttempts property in options
        options.retryAttempts = (options.retryAttempts || 0) + 1;

        logger('Retrying in %sms', 200 << options.retryAttempts);  // eslint-disable-line no-bitwise

        return delay(200 << options.retryAttempts) // eslint-disable-line no-bitwise
          .then(() => requestBuilder(options));
      }
      logger(`No response from url ${options.uri} during any calls or re-tries`);
      return Promise.reject(error);
    };

    // Try pre-set auth token first
    return passedInAuth(options, retryLoop);
  };

  return request.defaults(requestBuilder);
})();

module.exports.credentialCache = cache.cache;
module.exports.defaultCache = cache.defaultCache;

module.exports.setCredentialCache = (altCache) => {
  cache.setCache(altCache);
};

module.exports.setLogger = (l) => {
  logger = l;
  cache.setLogger(logger);
  passedInAuth.setLogger(logger);
};

module.exports.requestEmitter = re;
