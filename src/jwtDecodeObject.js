const jwtDecode = require('jwt-decode');

/**
 * Due to the way the Javascript module framework works,
 * sinon is unable to mock the jwt-decode library directly.
 * Since this breaks our tests irreparably, it's easiest just to export
 * an object that exposes an API similar to how we used jsonwebtoken
 */
module.exports = {
  decode: jwtDecode,
};
