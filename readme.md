
# cimpress-auth0-client-request-promise 
[![Build Status](https://travis-ci.org/Cimpress-MCP/cimpress-auth0-client-request-promise.svg?branch=master)](https://travis-ci.org/Cimpress-MCP/cimpress-auth0-client-request-promise)

[![NPM](https://nodei.co/npm/cimpress-auth0-client-request-promise.svg?downloads=true)](https://www.npmjs.com/package/cimpress-auth0-client-request-promise)

A module for handling generation of OAuth Bearer tokens issued by Auth0 by integrating credential management into request-promise.js.

This is a promise-request port from the original callback request library [here](https://github.com/Cimpress-MCP/cimpress-client-request)

## Installation

```shell
npm i cimpress-auth0-client-request-promise --save
```

OR

```shell
yarn add cimpress-auth0-client-request-promise
```

### Usage

This module exposes a few methods, but the most important one is:

```js
module.exports = (options) => { return Promise; }
```

This works as a drop-in replacement for [request-promise](https://github.com/request/request-promise).  Adopting this flow is as simple as these two surgical incisions:

```js
var request = require('cimpress-auth0-client-request-promise');
```

```js
// Note the set of 6 possible new options that can be passed in the request.js options.auth object.
// Every other property in the request options object works as normal, and you can call all of the
// convenience methods exposed by request.js.
var options = {
  auth: {
    clientId: 'see below',
    clientSecret: 'see below',
    refreshToken: 'see below',
    targetId: 'see below',
    bearer: 'see below',
  },
  keyGen: (options) => `${options.uri}-${options.method}-${options.auth.bearer}`,
  timesToRetry: 2,
  cacheAll: true,
};
return request(options).then(
  (response) => {},
  (error) => {}
);
```

Here's how you should use those 5 `auth` parameters + 2 new parameters:

| Property | Description | V1 Required | V2 Required |
|---|---|---|---|
| clientId | The client id you wish to use to request client credential grants (https://auth0.com/docs/api-auth/grant/client-credentials). | N/A | Y |
| clientSecret | The client secret you wish to use to request client credential grants (https://auth0.com/docs/api-auth/grant/client-credentials). | N/A | Y |
| refreshToken | A refresh token for use in delegation flows, retrieved from developer.cimpress.io. | Y | N/A |
| targetId | The client id for which you are trying to retrieve a delegated token.  Note, if you don't know this, you can rely on a 401 with a `Www-Authenticate` to provide the client id.  If you don't provide this config, and the service doesn't provide that header, your call will fail with a 401. | N | N/A |
| bearer | If you've already generated an access token you can specify it here and the library will attempt to use it. If the call fails with a 401 the library will immediately return | N | N |
| authorizationServer | OPTIONAL The server to call to request client credential grants  (https://auth0.com/docs/api-auth/grant/client-credentials).  This defaults to https://cimpress-dev.auth0.com/oauth/token. | Y | Y |
| audience | The audience to send when requesting client credential grants  (https://auth0.com/docs/api-auth/grant/client-credentials). This defaults to https://api.cimpress.io/ | Y | Y |
| keyGen | OPTIONAL A function that returns a string to be used when caching responses. Takes in the options object and must return a promise. If not specified a default function is used | N/A | N/A |
| timesToRetry | OPTIONAL The number of times to retry when receiving a non-2XX response. Otherwise keeps trying forever | N/A | N/A |
| cacheAll | OPTIONAL By default the library only caches GET, HEAD, and OPTIONS requests. Set this to true if you want to also cache all other request types | N/A | N/A |


Some other exposes methods:

```js
// specify a cache that will be used for the generated auth token as well as responses that have a cache-control header. By default there is no caching.
module.exports.setCredentialCache(altcache);  

// specify an alternative logger.
// by default the library only logs to console.log if the enviroment variable NODE_DEBUG is set equal to/includes 'cimpress-auth0-client-request-promise'
// otherwise the library does not log
module.exports.setLogger(altLogger); 
```
Note that the alternative caching method you use must return promises and have the following function definitions:
* get(key)
* set(key, value, ttl)

#### Events for Requests/Responses

The library has a custom event emitter that emits on outgoing requests and incoming responses. This means that events will be emited for both requests to the specified url as well as requests made when generating an auth token, if needed.

```js
const request = require('cimpress-auth0-client-request-promise');
const re = request.requestEmitter;

// Tip: Make sure the auth token has been removed before printing values out
re.on(re.requestSentEvent, options => console.log(options));
re.on(re.responseReceivedEvent, response => console.log(response));
```

#### Wrapper

A helpful wrapper has been added that allows you to set some values constant between request (clientId, secret, etc..) as well as setting up the cache.

This wrapper returns a function with a simplified signature of:
```js
return (method, url, body, headers, accessToken) => {};
```

Note that the accessToken must be a bearer token.

```js
const wrapper = require('cimpress-auth0-client-request-promise/wrapper');
const cache = require('some-caching-library');

const config = {
  audience: 'https://audience.com',  // default is same as main library if not specified
  clientId: 'asd',
  clientSecret: 'fgh',
  refreshToken: 'lkj',
  keyGen: () => 'a',  // see main library for details
};

const primedWrapper = wrapper(config, cache);

// making a call
return primedWrapper(
  'GET', // method (required)
  'https://1234.com',  // url (required)
  { message: 'Hi I\'m a body!' }, // body
  { customHeader: '5689' }, // custom headers (set to 'content-type' = 'application/json' by default)
  'qazwsx');  // accessToken
```

You can also access the requestEmitter via wrapper.requestEmitter. See above for how to use it.

### Tests
You might also want to look at our tests to see some examples of usage.

You can run tests via `npm test`.

## Development

### Getting Started from Source

```shell
# From Root
npm install
```

OR 

```shell
# From Root
yarn
```

#### Code Formatting

We use eslint for formatting and mostly follow the airbnb standards

## Making Changes

### Contributing
To contribute to this library fork the repo and create a pull-request back to the master branch.

All changes require tests to be added or updated as part of the PR.

Once Travis successfully runs, including running  the linter and all tests, your PR will require approval before merging.

### Publishing

To publish a new version of this library make a pull-request to master updating the version in package.json. Once the update merges a new version of the package should be published shortly!