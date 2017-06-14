const rewire = require('rewire');
const expect = require('chai').expect;

const auth0V2 = rewire('../../src/auth0V2');

describe('Auth0V2 generateAuthV2TokenCacheKey', () => {
  const generateAuthV2TokenCacheKey = auth0V2.__get__('generateAuthV2TokenCacheKey');

  it('should output the expected cache key', () => {
    const clientId = '123';
    const audience = 'abc';

    const config = {
      clientId,
    };

    expect(generateAuthV2TokenCacheKey(config, audience)).to.equal('abc-123');
  });
});
