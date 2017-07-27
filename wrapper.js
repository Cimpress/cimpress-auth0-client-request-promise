const request = require('./index');
const _ = require('lodash');

module.exports = (config, cache) => {
  const audience = _.get(config, 'resourceServer', 'https://api.cimpress.io/');

  if (cache) {
    request.setCredentialCache(cache);
  }

  return (method, url, body, headers, accessToken) => {
    let customHeaders = headers;
    if (customHeaders) {
      if (!customHeaders['content-type']) {
        customHeaders['content-type'] = 'application/json';
      }
    } else {
      customHeaders = {
        'content-type': 'application/json',
      };
    }

    const options = {
      method,
      url,
      headers: customHeaders,
      auth: {
        audience,
        clientId: config.clientId,
        clientSecret: config.clientSecret,
        refreshToken: config.refreshToken,
      },
      timesToRetry: 2,
    };

    if (body) {
      // setting a null body in options can cause issues
      options.body = body;
    }

    if (accessToken) {
      options.auth.bearer = accessToken;
    }

    if (config.keyGen) {
      options.keyGen = config.keyGen;
    }

    return request(options);
  };
};

module.exports.requestEmitter = request.requestEmitter;
