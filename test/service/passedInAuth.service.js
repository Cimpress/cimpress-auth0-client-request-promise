/**
 * This test calls an API that expects a client credentials grant.
 */
let request = require('../../index');
const expect = require('chai').expect;
const nock = require('nock');
const mock = require('mock-require');

describe('When an auth token is passed in', () => {
  before(() => {
    mock('jwt-decode', () => ({
      sub: 'abcd',
    }));
    request = mock.reRequire('../../index');
  });

  after(() => {
    mock.stopAll();
  });

  afterEach(() => {
    nock.cleanAll();
  });

  const config = {
    bearer: '12345',
  };

  const testUrl = 'http://www.example.com';

  it('Should use that token to make a successful request', () => {
    nock(testUrl)
      .get('/')
      .reply(function () {  // nock doesn't set this.req without 'function'
        expect(this.req.headers).to.not.be.null;
        expect(this.req.headers.authorization).to.not.be.undefined;
        expect(this.req.headers.authorization).to.equal(`Bearer ${config.bearer}`);
        return [200, 'I\'m a reply body!'];
      });

    request({
      method: 'GET',
      auth: config,
      uri: testUrl,
      timesToRetry: 1,
    }).then((res) => {
      expect(res.statusCode).not.to.equal(401);
    });
  });

  it('Should use that token to make a successful request even when method isn\'t specified', () => {
    nock(testUrl)
      .get('/')
      .reply(function () {  // nock doesn't set this.req without 'function'
        expect(this.req.headers).to.not.be.null;
        expect(this.req.headers.authorization).to.not.be.undefined;
        expect(this.req.headers.authorization).to.equal(`Bearer ${config.bearer}`);
        return [200, 'I\'m a reply body!'];
      });

    request({
      auth: config,
      uri: testUrl,
      timesToRetry: 1,
    }).then((res) => {
      expect(res.statusCode).not.to.equal(401);
    });
  });
});
