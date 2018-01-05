const request = require('request-promise');
const _ = require('lodash');
const auth0V2 = require('./auth0V2');
const cache = require('./cache');
const re = require('./requestEmitter');

let logger = process.env.NODE_DEBUG && process.env.NODE_DEBUG.includes('cimpress-auth0-client-request-promise')
  ? console.log
  : () => { };

const makeRequest = (options, retryLoop) => {
  const requestOptions = _.assign({}, options);
  _.assign(requestOptions, {
    json: true,
    resolveWithFullResponse: true,
    simple: false,
  });

  re.emit(re.requestSentEvent, requestOptions);
  return request(requestOptions)
    .promise()
    .tap(res => re.emit(re.responseReceivedEvent, res))
    .catch((error) => {
      logger(`Call to ${options.uri} failed with: ${error}`);
      return retryLoop(error);
    });
};

const passedInAuth = (options, retryLoop) => {
  if (options.auth && options.auth.bearer) {
    return cache.checkCacheForResponse(options).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return makeRequest(options, retryLoop).then((res) => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          cache.saveResponseInCache(options, res);
        }
        return res;
      });
    });
  }
  logger('No token passed in. Falling back to v2.');
  // TODO: index should make this call
  return auth0V2(options, retryLoop);
};

module.exports = passedInAuth;

module.exports.setLogger = (altLogger) => {
  logger = altLogger;
  auth0V2.setLogger(altLogger);
};
