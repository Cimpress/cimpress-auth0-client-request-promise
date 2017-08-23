const _ = require('lodash');
const Promise = require('bluebird');
const jwt = require('jsonwebtoken');
const request = require('request-promise');
const cache = require('./cache');
const re = require('./requestEmitter');

// TODO: get from options
const REFRESH_TOKEN_CLIENT_ID = process.env.DEFAULT_TARGET_ID || 'QkxOvNz4fWRFT6vcq79ylcIuolFz2cwN';
let logger = process.env.NODE_DEBUG && process.env.NODE_DEBUG.includes('cimpress-auth0-client-request-promise')
  ? console.log
  : () => { };

const generateAuthV1TokenCacheKey = config =>
  (config.clientId ? `${config.targetId}-${config.clientId}` : `${config.targetId}`);

const saveV1TokenInCache = (config, token) => {
  const cacheKey = generateAuthV1TokenCacheKey(config);
  const decodedToken = jwt.decode(token);
  return cache.set(cacheKey, token, decodedToken.exp - decodedToken.iat)
    .catch(err => logger(`Error saving v1 token ${cacheKey} in cache: ${JSON.stringify(err)}`));
};

const retrieveV1TokenFromCache = (config) => {
  const cacheKey = generateAuthV1TokenCacheKey(config);
  return cache.get(cacheKey)
    .catch(err => logger(`Error retrieving auth0v1 token ${cacheKey} from cache with target id: ${config.targetId}: ${JSON.stringify(err)}`));
};

const retrieveV1TokenFromServer = (config) => {
  const delegationOptions = {
    method: 'POST',
    url: config.authorizationServer || 'https://cimpress.auth0.com/delegation',
    headers: { 'content-type': 'application/json' },
    body: {
      client_id: REFRESH_TOKEN_CLIENT_ID,
      target: config.targetId,
      // TODO: no env vars
      refresh_token: config.refreshToken || process.env.CIMPRESS_IO_REFRESH_TOKEN,
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      api_type: 'app',
      scope: config.scope || 'openid',
    },
    json: true,
    resolveWithFullResponse: true,
    simple: false,
  };

  re.emit(re.requestSentEvent, delegationOptions);
  return request(delegationOptions)
    .promise()
    .tap(res => re.emit(re.responseReceivedEvent, res))
    .catch((error) => {
      logger(`Error retrieving auth0v1 token from Auth0 server: ${error}`);
      throw error;
    });
};

const retrieveV1Token = (config) => {
  const cacheKey = generateAuthV1TokenCacheKey(config);

  return retrieveV1TokenFromCache(config).then((jwtObj) => {
    if (jwtObj) {
      logger(`Found cached credential ${cacheKey}`);
      return jwtObj;
    }

    return retrieveV1TokenFromServer(config).then((response) => {
      saveV1TokenInCache(config, response.body.id_token);
      return response.body.id_token;
    });
  }).catch((err) => {
    logger(JSON.stringify(err));
    return Promise.reject(err);
  });
};

/**
 * Given an HTTP response, generate and return a configuration object suitable for passing as
 * the first parameter of compute_bearer.  If no suitable config can be generated due to the
 * absence of Www-Authenticate headers, this method returns undefined.
 */
const parseAuthHeaders = (config, res) => {
  if (res.headers['www-authenticate']) {
    const matches = res.headers['www-authenticate'].match(/client_id=([^\s]+)/);
    if (matches && matches.length > 0) {
      return {
        refreshToken: config.refreshToken,
        targetId: matches[1],
      };
    }
  }
  return null;
};

const makeUnauthenticatedRequest = (options) => {
  const noAuthRequestOptions = _.assign({}, options);
  _.assign(noAuthRequestOptions, {
    json: true,
    resolveWithFullResponse: true,  // get headers & status code as well as body
    simple: false, // treats non-500 errors as success
    auth: undefined,
  });

  re.emit(re.requestSentEvent, noAuthRequestOptions);
  return request(noAuthRequestOptions)
    .promise()
    .tap(res => re.emit(re.responseReceivedEvent, res))
    .catch((error) => {
      logger(`Request to ${noAuthRequestOptions.uri} failed due to: ${error}`);
      return Promise.reject(error);
    });
};

const auth0v1 = (options, retryLoop, res) => {
  // If we got an unauthorized since this API doesn't support client grant flows, we
  // pass the response to parse_auth_headers to find a config that might work better.
  const delegateConfig = res ? parseAuthHeaders(options.auth, res) : options.auth;

  // Validate whether we have enough information to authenticate
  if (!(delegateConfig && delegateConfig.refreshToken && delegateConfig.targetId)) {
    if (res) {
      return Promise.reject('Not enough information for a delegation call');
    }

    logger('No v1 auth possible. Attempting an unauthenticated request');

    return makeUnauthenticatedRequest(options)
      .then((response) => {
        if (response.statusCode === 401) {
          return auth0v1(options, retryLoop, response);
        }
        return response;
      });
  }

  return retrieveV1Token(delegateConfig)
    .then((token) => {
      const authRequestOptions = _.assign({}, options);
      authRequestOptions.auth.bearer = token;

      return cache.checkCacheForResponse(authRequestOptions)
        .then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }

          _.assign(authRequestOptions, {
            json: true,
            simple: false,
            resolveWithFullResponse: true,
          });

          re.emit(re.requestSentEvent, authRequestOptions);
          return request(authRequestOptions)
            .promise()
            .tap(response => re.emit(re.responseReceivedEvent, response))
            .catch((error) => {
              logger(`Call to ${authRequestOptions.uri} failed, retrying. Error: ${error}`);
              return retryLoop(error);
            })
            .then((response) => {
              if (response.statusCode >= 200 && response.statusCode < 300) {
                cache.saveResponseInCache(options, response);
              }
              return response;
            });
        });
    });
};

// TODO: simplify
module.exports = (options, retryLoop, res) => auth0v1(options, retryLoop, res);

module.exports.setLogger = (altLogger) => {
  logger = altLogger;
};
