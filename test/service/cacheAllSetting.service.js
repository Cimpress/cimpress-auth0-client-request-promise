/**
 * Checks the behavior of the cacheAll attribute that can be passed in when making a request
 */
const request = require('../../index');
const expect = require('chai').expect;
const nock = require('nock');
const sinon = require('sinon');
const Promise = require('bluebird');
const jwt = require('../../src/jwtDecodeObject');

describe('Setting the cacheAll field in options', () => {
  let jwtDecodeStub;
  let oldCache;

  before(() => {
    oldCache = request.credentialCache;
    jwtDecodeStub = sinon
      .stub(jwt, 'decode')
      .callsFake(() => ({
        sub: 'abcd',
      }));
  });

  afterEach(() => {
    request.setCredentialCache(oldCache);
    nock.cleanAll();
  });

  after(() => {
    jwtDecodeStub.restore();
  });

  const config = {
    bearer: '12345',
  };

  const testUrl = 'http://www.example.com';

  const keyGenFunction = options => Promise.resolve(options.method);

  it('should cache all requests if set to true', (done) => {
    const methodType = 'POST';
    const timeToLive = 30;

    const altCache = {
      get: () => Promise.resolve(),
      set: (key) => {
        expect(key).to.equal(methodType);
        done(); // must call done here, otherwise request will return before this is hit
      },
    };

    request.setCredentialCache(altCache);

    nock(testUrl)
      .post('/')
      .reply(() => [200, 'I\'m a request body!', { 'Cache-Control': `public, max-age=${timeToLive}` }]);

    request({
      method: methodType,
      auth: config,
      url: testUrl,
      keyGen: keyGenFunction,
      timesToRetry: 1,
      cacheAll: true,
      body: {},
    }).then((res) => {
      expect(res.statusCode).to.equal(200);
    });
  });

  it('shouldn\'t cache all requests if set to false', () => {
    const methodType = 'POST';
    const timeToLive = 30;

    const altCache = {
      get: () => Promise.resolve(),
      set: () => {
        expect(true).to.equal(false);
      },
    };

    request.setCredentialCache(altCache);

    nock(testUrl)
      .post('/')
      .reply(() => [200, 'I\'m a request body!', { 'Cache-Control': `public, max-age=${timeToLive}` }]);

    request({
      method: methodType,
      auth: config,
      url: testUrl,
      keyGen: keyGenFunction,
      timesToRetry: 1,
      cacheAll: false,
      body: {},
    }).then((res) => {
      expect(res.statusCode).to.equal(200);
    });
  });
});
