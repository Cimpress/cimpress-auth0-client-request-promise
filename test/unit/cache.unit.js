const rewire = require('rewire');
const expect = require('chai').expect;

const cache = rewire('../../src/cache');

describe('Cache parseCacheControlHeader', () => {
  const parseCacheControlHeader = cache.__get__('parseCacheControlHeader');

  it('should return the max-age when it exists (random uppercase)', () => {
    const maxAge = 300;
    const headers = {
      'CaChE-CoNtRoL': `max-age=${maxAge}`,
    };

    return parseCacheControlHeader(headers).then((time) => {
      expect(time).to.equal(maxAge);
    });
  });

  it('should return the max-age when it exists (lowercase)', () => {
    const maxAge = 300;
    const headers = {
      'cache-control': `max-age=${maxAge}`,
    };

    return parseCacheControlHeader(headers).then((time) => {
      expect(time).to.equal(maxAge);
    });
  });

  it('should return 0 when no cache-control header exists', () => parseCacheControlHeader({})
    .then((time) => {
      expect(time).to.equal(0);
    }));

  it('should return 0 when no max-age value in the cache-control header exists', () => {
    const headers = {
      'cache-control': 'public',
    };

    return parseCacheControlHeader(headers).then((time) => {
      expect(time).to.equal(0);
    });
  });
});

describe('Cache constructCacheKey', () => {
  const constructCacheKey = cache.__get__('constructCacheKey');

  it('should output the expected cache key with auth and sub', () => {
    const bearer = 'abc';
    const method = 'POST';
    const uri = 'http://example.com';
    const sub = '123';

    const options = {
      method,
      uri,
      auth: {
        bearer,
      },
    };

    return constructCacheKey(options).then((cacheKey) => {
      expect(cacheKey).to.not.be.undefined;
      expect(cacheKey).to.equal(`${method}-${uri}-${sub}`);
    });
  });

  it('should output the expected cache key with auth but no sub', () => {
    const bearer = 'abc';
    const method = 'POST';
    const uri = 'http://example.com';

    const options = {
      method,
      uri,
      auth: {
        bearer,
      },
    };

    return constructCacheKey(options).then((cacheKey) => {
      expect(cacheKey).to.not.be.undefined;
      expect(cacheKey).to.equal(`${method}-${uri}`);
    });
  });

  it('should output the expected cache key without auth', () => {
    const method = 'POST';
    const uri = 'http://example.com';

    const options = {
      method,
      uri,
    };

    return constructCacheKey(options).then((cacheKey) => {
      expect(cacheKey).to.not.be.undefined;
      expect(cacheKey).to.equal(`${method}-${uri}`);
    });
  });
});
