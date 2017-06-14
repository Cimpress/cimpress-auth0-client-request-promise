/**
 * This test calls an API that expects a client credentials grant.
 */
const request = require('../../index');
const expect = require('chai').expect;
const nock = require('nock');

describe('Auth0 V2 api-auth client grants', () => {
  const authServerUrl = 'https://authserver.com';
  const audience = 'abcd';
  const clientId = '9876';
  const clientSecret = '123456789';
  const url = 'https://testing.com';
  const authToken = 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6IjEyMzQ1Njc4OSJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiYWRtaW4iOnRydWV9.uZ5tQFlyMXG0axBjSjmoBi5QcRghBl7weso5o8ZFS4EQpSJOTxWQHMCkI_2oeJo_XXdNdAZR2jXZth_-0GsbDiqrH5vAHZi-Vj1LfS6GQBzWOgADldJxkx3mQ7jnBVNTpuJBLfMrCe-6ixwnQgDcai1TI-wjS-Q6TRT5mvIKGAM';

  const config = {
    authorizationServer: authServerUrl,
    audience,
    clientId,
    clientSecret,
  };

  afterEach(() => {
    nock.cleanAll();
  });

  it('Should make a successful request against the backing API', () => {
    nock(authServerUrl)
      .post('/')
      .reply((uri, requestBody) => {
        expect(requestBody.audience).to.equal(audience);
        expect(requestBody.client_id).to.equal(clientId);
        expect(requestBody.client_secret).to.equal(clientSecret);
        expect(requestBody.grant_type).to.equal('client_credentials');
        return [200, { access_token: authToken }];
      });

    nock(url)
      .get('/')
      .reply(function () {
        expect(this.req.headers).to.not.be.null;
        expect(this.req.headers.authorization).to.not.be.undefined;
        expect(this.req.headers.authorization).to.equal(`Bearer ${authToken}`);
        return [200, ''];
      });

    return request({
      auth: config,
      url,
    }).then((response) => {
      expect(response).to.not.be.undefined;
      expect(response.statusCode).to.not.equal(401);
    });
  });
});
