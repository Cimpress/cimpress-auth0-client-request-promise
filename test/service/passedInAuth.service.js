/**
 * This test calls an API that expects a client credentials grant.
 */
const request = require('../../index');
const expect = require('chai').expect;
const nock = require('nock');
const sinon = require('sinon');
const jwt = require('jsonwebtoken');

describe('When an auth token is passed in', () => {
  let jwtDecodeStub;

  before(() => {
    jwtDecodeStub = sinon
      .stub(jwt, 'decode')
      .callsFake(() => 'abcd');
  });

  after(() => {
    jwtDecodeStub.restore();
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
