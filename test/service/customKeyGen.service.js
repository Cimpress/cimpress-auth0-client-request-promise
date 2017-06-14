/**
 * This test calls an API that expects a client credentials grant
 * and confirms that the provided custom key gen function was used.
 */
const request = require('../../index');
const expect = require('chai').expect;
const nock = require('nock');
const Promise = require('bluebird');

describe('Given a custom key gen function', () => {
  let cache;
  const oldCache = request.credentialCache;
  const valKeyGenReturns = '123abc456';
  const audience = 'https://audience.com';

  const url = 'https://testing.com';

  const config = {
    bearer: '12345',
  };

  const keyGenFunction = () => Promise.resolve(valKeyGenReturns);

  after(() => {
    request.setCredentialCache(oldCache);
  });

  afterEach(() => {
    nock.cleanAll();
  });

  it('Should use the passed in function when saving the response', (done) => {
    cache = {
      set: (key) => {
        if (key !== audience) {
          expect(key).to.equal(valKeyGenReturns);
          done();
        }
        return Promise.resolve();
      },
      get: () => Promise.resolve(null),
    };

    request.setCredentialCache(cache);

    nock(url)
      .get('/')
      .reply(() => [200, 'Success!', { 'Cache-Control': 'public, max-age=10' }]);

    request({
      auth: config,
      url,
      keyGen: keyGenFunction,
      timesToRetry: 1,
    }).then((res) => {
      expect(res).to.not.be.undefined;
      expect(res.statusCode).not.to.equal(401);
    });
  });
});
