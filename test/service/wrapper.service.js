const requestWrapper = require('../../wrapper');
const request = require('../../index');
const expect = require('chai').expect;
const nock = require('nock');
const Promise = require('bluebird');

describe('Using the wrapper', () => {
  afterEach(() => {
    nock.cleanAll();
  });

  const keyGenFunction = () => Promise.resolve('a');
  const authToken = '1234';

  const testUrl = 'http://www.example.com';

  it('Should return a helper method that works as expected', () => {
    const message = 'You Got Me';
    nock(testUrl)
    .get('/')
    .reply(200, { message });

    const cache = {
      get: () => Promise.resolve(),
      set: () => Promise.resolve(),
    };

    const config = {
      audience: 'blahblahblah',
      keyGen: keyGenFunction,
    };

    const helperMethod = requestWrapper(config, cache);

    expect(JSON.stringify(request.credentialCache)).to.equal(JSON.stringify(cache));

    return helperMethod('GET', testUrl, null, null, authToken)
    .then((res) => {
      expect(res).to.not.be.undefined;
      expect(res.body).to.not.be.undefined;
      expect(res.body.message).to.equal(message);
    });
  });
});
