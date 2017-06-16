const _ = require('lodash');
const jwt = require('jsonwebtoken');
const request = require('request-promise');
const cache = require('./cache');
const auth0V1 = require('./auth0V1');

let logger = process.env.NODE_DEBUG && process.env.NODE_DEBUG.includes('cimpress-auth0-client-request-promise')
  ? console.log
  : () => { };

const generateAuthV2TokenCacheKey = (config, audience) => `${audience}-${config.clientId}`;

const retrieveV2TokenFromCache = (config, audience) => {
  const cacheKey = generateAuthV2TokenCacheKey(config, audience);
  return cache.get(cacheKey)
    .catch((err) => {
      logger(`Error retrieving auth0v2 token ${cacheKey} from cache with audience ${audience}: ${JSON.stringify(err)}`);
    });
};

const saveV2TokenInCache = (config, audience, token) => {
  const cacheKey = generateAuthV2TokenCacheKey(config, audience);
  const decodedToken = jwt.decode(token);
  return cache.set(cacheKey, token, decodedToken.exp - decodedToken.iat)
    .catch((error) => {
      logger(`Error saving v2 token ${cacheKey} in cache: ${JSON.stringify(error)}`);
    });
};

const retrieveV2TokenFromServer = (config, audience) => {
  const clientGrantOptions = {
    method: 'POST',
    url: config.authorizationServer || 'https://cimpress.auth0.com/oauth/token',
    headers: { 'content-type': 'application/json' },
    body: {
      audience,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      grant_type: 'client_credentials',
    },
    json: true,
  };

  return request(clientGrantOptions).catch((error) => {
    logger(`Error retrieving auth0v2 token from Auth0 server: ${error}`);
    throw error;
  });
};

const retrieveV2Token = (config) => {
  const audience = config.audience || 'https://api.cimpress.io/';


  return retrieveV2TokenFromCache(config, audience).then((jwtObj) => {
    if (jwtObj) {
      logger(`Found cached credential ${audience}`);
      return jwtObj;
    }

    return retrieveV2TokenFromServer(config, audience).then((body) => {
      // Store the jwt keyed on the audience
      saveV2TokenInCache(config, audience, body.access_token);
      return body.access_token;
    });
  });
};


const auth0v2 = (options, retryLoop) => {
  // Validate whether we have enough information to attempt authentication
  if (!(options.auth && options.auth.clientId && options.auth.clientSecret)) {
    logger('No v2 auth possible. Falling back to v1.');
    // TODO: call from index
    return auth0V1(options, retryLoop);
  }

  return retrieveV2Token(options.auth).then((token) => {
    const requestOptions = _.assign({}, options);
    requestOptions.auth.bearer = token;

    return cache.checkCacheForResponse(requestOptions).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      _.assign(requestOptions,
        {
          json: true,
          simple: false,
          resolveWithFullResponse: true,
        });

      return request(requestOptions)
        .catch((error) => {
          logger(`Call to ${requestOptions.uri} failed, retrying. Error: ${error}`);
          return retryLoop(error);
        }).then((res) => {
          // If we got a 401, move on to v1auth
          if (res && res.statusCode === 401) {
            // TODO: call this in index
            return auth0V1(options, retryLoop, res);
          }

          if (res.statusCode >= 200 && res.statusCode < 300) {
            cache.saveResponseInCache(options, res);
          }
          return res;
        });
    });
  });
};

module.exports = (options, retryLoop) => auth0v2(options, retryLoop);

module.exports.setLogger = (altLogger) => {
  logger = altLogger;
  auth0V1.setLogger(altLogger);
};
