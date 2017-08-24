/**
 * This test calls an API that expects a client credentials grant.
 */
let request = require('../../index');
const expect = require('chai').expect;
const nock = require('nock');
const Promise = require('bluebird');
const mock = require('mock-require');

describe('Making a new request', () => {
  let oldCache;

  before(() => {
    oldCache = request.credentialCache;
    mock('jwt-decode', () => ({
      sub: 'abcd',
    }));
    request = mock.reRequire('../../index');
  });

  afterEach(() => {
    request.setCredentialCache(oldCache);
    nock.cleanAll();
  });

  after(() => {
    mock.stopAll();
  });

  const config = {
    bearer: '12345',
  };

  const testUrl = 'http://www.example.com';

  it('Should respect cache control headers and store the response in the cache', (done) => {
    const timeToLive = 30;

    const altCache = {
      get: () => Promise.resolve(undefined),
      set: (key, object, ttl) => {
        if (key.includes(testUrl)) {
          expect(ttl).to.equal(timeToLive);
          done();   // request returns before cache is set, so have to call done here
        }
        return Promise.resolve();
      },
    };

    request.setCredentialCache(altCache);

    nock(testUrl)
      .get('/')
      .reply(() => [200, 'I\'m a request body!', { 'Cache-Control': `public, max-age=${timeToLive}` }]);

    request({
      method: 'GET',
      auth: config,
      url: testUrl,
    }).then((res) => {
      expect(res.statusCode).not.to.equal(401);
    });
  });

  it('Shouldn\'t add a new entry when a response already exists in the cache', () => {
    const cacheBody = 'I\'m a cached body!';
    const cacheKey = 'ImACacheKey';
    const keyGen = () => Promise.resolve(cacheKey);

    const altCache = {
      get: (key) => {
        expect(key).to.equal(cacheKey);
        return Promise.resolve(JSON.stringify({ body: cacheBody }));
      },
      set: () => {
        expect(true).to.be.false; // shouldn't have hit this
        return Promise.resolve();
      },
    };

    request.setCredentialCache(altCache);

    return request({
      method: 'GET',
      auth: config,
      uri: testUrl,
      keyGen,
    }).then((response) => {
      expect(response).to.not.be.null;
      expect(response.statusCode).to.not.equal(401);
      expect(response.body).to.not.be.null;
      expect(response.body).to.equal(cacheBody);
    });
  });

  it('Shouldn\'t add a new entry when a response status code is an error', () => {
    const altCache = {
      get: () => Promise.resolve(null),
      set: () => {
        expect(true).to.not.be.false;
      },
    };

    request.setCredentialCache(altCache);

    nock(testUrl)
      .get('/')
      .reply(() => [404, 'I\'m a reply body!', { 'Cache-Control': 'public, max-age=10' }]);

    return request({
      method: 'GET',
      auth: config,
      uri: testUrl,
    }).then((res) => {
      expect(res).to.not.be.null;
      expect(res.statusCode).to.equal(404);
    });
  });
});
