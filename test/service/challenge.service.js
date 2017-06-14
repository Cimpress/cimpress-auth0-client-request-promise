/**
 * This test calls an API that attempts a client credentials grant and
 * then fails back to delegated auth upon 401.
 */
const request = require('../../index');
const expect = require('chai').expect;
const nock = require('nock');

describe('Graceful failover from Auth0 api-auth to delegated tokens', () => {
  const audience = 'https://audience.com';
  const clientId = '1234';
  const clientSecret = '5678';
  const refreshToken = '12345678';
  const url = 'https://testing.com';
  const authV2Token = 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6IjEyMzQ1Njc4OSJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiYWRtaW4iOnRydWV9.uZ5tQFlyMXG0axBjSjmoBi5QcRghBl7weso5o8ZFS4EQpSJOTxWQHMCkI_2oeJo_XXdNdAZR2jXZth_-0GsbDiqrH5vAHZi-Vj1LfS6GQBzWOgADldJxkx3mQ7jnBVNTpuJBLfMrCe-6ixwnQgDcai1TI-wjS-Q6TRT5mvIKGAM';
  const authV1Token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiYWRtaW4iOnRydWV9.TJVA95OrM7E2cBab30RMHrHDcEfxjoYZgeFONFh7HgQ';
  const callingClientId = 'abcd';
  const v1AuthServer = 'https://v1auth.com';
  const config = {
    audience,
    clientId,
    clientSecret,
    refreshToken,
  };

  afterEach(() => {
    nock.cleanAll();
  });

  it('Should make a successful request against the backing API', () => {
    nock('https://cimpress.auth0.com')
      .post('/oauth/token')
      .reply((uri, requestBody) => {
        expect(requestBody.audience).to.equal(audience);
        expect(requestBody.client_id).to.equal(clientId);
        expect(requestBody.client_secret).to.equal(clientSecret);
        expect(requestBody.grant_type).to.equal('client_credentials');
        return [200, { access_token: authV2Token }];
      })
      .post('/delegation')
      .reply((uri, requestBody) => {
        expect(requestBody.client_id).to.equal('QkxOvNz4fWRFT6vcq79ylcIuolFz2cwN');
        expect(requestBody.target).to.equal(callingClientId);
        expect(requestBody.refresh_token).to.equal(refreshToken);
        return [200, { id_token: authV1Token }];
      });

    nock(url)
      .get('/')
      .twice()
      .reply(function () {
        expect(this.req.headers).to.not.be.null;
        expect(this.req.headers.authorization).to.not.be.undefined;
        if (this.req.headers.authorization === `Bearer ${authV2Token}`) {  // v2
          return [401, 'v2 not supported', { 'www-authenticate': `Bearer realm="${v1AuthServer}", scope="client_id=${callingClientId} service=${url}"` }];
        }
        expect(this.req.headers.authorization).to.be.equal(`Bearer ${authV1Token}`);
        return [200, 'v1 supported!'];
      });

    return request({
      auth: config,
      url,
    }).then((response) => {
      expect(response).to.not.be.undefined;
      expect(response.statusCode).not.to.equal(401);
    });
  });
});
