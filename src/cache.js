const Promise = require('bluebird');
const _ = require('lodash');
const parseCacheControl = require('parse-cache-control');
const jwt = require('jsonwebtoken');

const defaultCache = {
  get: () => Promise.resolve(),
  set: () => Promise.resolve(),
};

let credentialCache = defaultCache;
let keyGenFunc;
let logger;

const parseCacheControlHeader = (headers) => {
  if (headers) {
    const headerKeys = Object.keys(headers);
    const cacheControlKey = _.find(headerKeys, key => key.toLowerCase() === 'cache-control');
    if (cacheControlKey && headers[cacheControlKey]) {
      return Promise.resolve(parseCacheControl(headers[cacheControlKey])['max-age'] || 0);
    }
  }
  return Promise.resolve(0);
};

// default function
const constructCacheKey = (options) => {
  try {
    if (options.auth && options.auth.bearer) {
      const decodedToken = jwt.decode(options.auth.bearer);
      if (decodedToken && decodedToken.sub) {
        return Promise.resolve(`${options.method}-${options.uri}-${decodedToken.sub}`);
      }
    }
    return Promise.resolve(`${options.method}-${options.uri}`);
  } catch (error) {
    logger(`Error generating cache key: ${JSON.stringify(error)}`);
    throw error;
  }
};

const setKeyGenFunc = (options) => {
  keyGenFunc = options.keyGen || constructCacheKey;
};

const checkCacheForResponse = options => keyGenFunc(options)
  .then(cacheKey => credentialCache.get(cacheKey))
  .then(data => (data ? JSON.parse(data) : null))
  .catch(error => logger(`Error when checking for cached responses: ${JSON.stringify(error)}`));

const saveResponseInCache = (options, res) =>
  parseCacheControlHeader(res.headers)
    .then((cacheControl) => {
      if (cacheControl) {
        keyGenFunc(options).then((cacheKey) => {
          credentialCache.set(
            cacheKey,
            JSON.stringify({ res }),
            cacheControl);
        });
      }
    });

const setLogger = (altLogger) => {
  logger = altLogger;
};

const setCache = (altCache) => {
  credentialCache = altCache;
};

const set = (key, value, ttl) => credentialCache.set(key, value, ttl)
  .catch((error) => {
    logger(`Error when saving responses with key ${key} in cache: ${JSON.stringify(error)}`);
  });

const get = key => credentialCache.get(key)
  .catch((error) => {
    logger(`Error retrieving data with key ${key} from the cache: ${JSON.stringify(error)}`);
  });

const cache = credentialCache;

module.exports = {
  setKeyGenFunc,
  checkCacheForResponse,
  saveResponseInCache,
  setLogger,
  setCache,
  set,
  get,
  defaultCache,
  cache,
};
