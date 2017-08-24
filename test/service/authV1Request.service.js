/**
 * This test calls an API that expects a delegated token.
 */
let request = require('../../index');
const expect = require('chai').expect;
const nock = require('nock');
const mock = require('mock-require');

describe('Auth0 v1 delegation', () => {
  const refreshToken = '12345678';
  const url = 'https://testing.com';
  const authV1Token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiYWRtaW4iOnRydWV9.TJVA95OrM7E2cBab30RMHrHDcEfxjoYZgeFONFh7HgQ';
  const callingClientId = 'abcd';
  const v1AuthServer = 'https://v1auth.com';

  before(() => {
    mock('jwt-decode', () => ({
      sub: 'abcd',
    }));
    request = mock.reRequire('../../index');
  });

  beforeEach(() => {
    nock('https://cimpress.auth0.com')
      .post('/delegation')
      .reply((uri, requestBody) => {
        expect(requestBody.client_id).to.equal('QkxOvNz4fWRFT6vcq79ylcIuolFz2cwN');
        expect(requestBody.target).to.equal(callingClientId);
        expect(requestBody.refresh_token).to.equal(refreshToken);
        return [200, { id_token: authV1Token }];
      });
  });

  after(() => {
    mock.stopAll();
  });

  afterEach(() => {
    nock.cleanAll();
  });

  const config = {
    targetId: callingClientId,
    refreshToken,
  };

  it('Should make a successful request against the backing API', () => {
    nock(url)
      .get('/')
      .once()
      .reply(function () {
        if (this.req.headers && this.req.headers.authorization) {
          expect(this.req.headers).to.not.be.null;
          expect(this.req.headers.authorization).to.not.be.undefined;
          expect(this.req.headers.authorization).to.be.equal(`Bearer ${authV1Token}`);
          return [200, 'v1 supported!'];
        }
        return [401, 'v2 not supported', { 'www-authenticate': `Bearer realm="${v1AuthServer}", scope="client_id=${callingClientId} service=${url}"` }];
      });

    return request({
      auth: config,
      url,
    }).then((res) => {
      expect(res.statusCode).not.to.equal(401);
    });
  });

  it('Should make a successful request against a backing API without a provided target_id', () => {
    nock(url)
      .get('/')
      .twice()
      .reply(function () {
        if (this.req.headers && this.req.headers.authorization) {
          expect(this.req.headers).to.not.be.null;
          expect(this.req.headers.authorization).to.not.be.undefined;
          expect(this.req.headers.authorization).to.be.equal(`Bearer ${authV1Token}`);
          return [200, 'v1 supported!'];
        }
        return [401, 'v2 not supported', { 'www-authenticate': `Bearer realm="${v1AuthServer}", scope="client_id=${callingClientId} service=${url}"` }];
      });

    return request({
      auth: { refreshToken: config.refreshToken },
      url,
    }).then((res) => {
      expect(res.statusCode).not.to.equal(401);
    });
  });
});
