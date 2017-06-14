const rewire = require('rewire');
const expect = require('chai').expect;

const auth0V1 = rewire('../../src/auth0V1');

describe('Auth0V1 generateAuthV1TokenCacheKey', () => {
  const generateAuthV1TokenCacheKey = auth0V1.__get__('generateAuthV1TokenCacheKey');

  it('should output the correct cache key when there is a clientId', () => {
    const config = {
      clientId: '123',
      targetId: '567',
    };
    expect(generateAuthV1TokenCacheKey(config)).to.equal('567-123');
  });

  it('should output the correct cache key when there is no clientId', () => {
    const config = {
      targetId: '567',
    };
    expect(generateAuthV1TokenCacheKey(config)).to.equal('567');
  });
});

describe('Auth0V1 parseAuthHeaders', () => {
  const parseAuthHeaders = auth0V1.__get__('parseAuthHeaders');

  it('should return values if auth header is present', () => {
    const clientId = '123abc';
    const refreshToken = 'abc123';

    const res = {
      headers: {
        'www-authenticate': `Bearer realm="cimpress.auth0.com", scope="client_id=${clientId} service=http://example.com"`,
      },
    };

    const config = {
      refreshToken,
    };

    const output = parseAuthHeaders(config, res);
    expect(output).to.not.be.undefined;
    expect(output.refreshToken).to.equal(refreshToken);
    expect(output.targetId).to.equal(clientId);
  });

  it('should return null if no auth header is present', () => {
    const refreshToken = 'abc123';

    const res = {
      headers: {},
    };

    const config = {
      refreshToken,
    };

    const output = parseAuthHeaders(config, res);
    expect(output).to.be.null;
  });

  it('should return null if auth header doesn\'t include clientId', () => {
    const refreshToken = 'abc123';

    const res = {
      headers: {
        'www-authenticate': 'Bearer',
      },
    };

    const config = {
      refreshToken,
    };

    const output = parseAuthHeaders(config, res);
    expect(output).to.be.null;
  });
});
