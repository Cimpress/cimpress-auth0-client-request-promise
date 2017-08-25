/**
 * This test makes a failed call and tries to make the call again
 */
const request = require('../../index');
const expect = require('chai').expect;
const nock = require('nock');
const sinon = require('sinon');
const jwt = require('../../src/jwtDecodeObject');

describe('When a call fails with a 5XX response', () => {
  const url = 'http://testing.com';
  const config = {
    bearer: '1234',
  };
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

  it('Should try to make the request again up to timesToRetry', () => {
    const errorObj = JSON.stringify({ message: 'Ahh I\'m a 5XX response. You should try again!', code: 'Internal Error' });
    nock(url)
      .get('/')
      .thrice()
      .replyWithError(errorObj);

    nock(url)
      .get('/')
      .reply(() => {
        expect(true).to.equal(false);
        return [404, {}];
      });

    return request({
      auth: config,
      url,
      timesToRetry: 1,
    }).then((response) => {
      expect(response).to.be.undefined;
    }, (error) => {
      expect(error.name).to.equal('RequestError');
      expect(error.message).to.equal(`Error: ${errorObj}`);
    });
  });

  it('Should try to make the request again until successful', () => {
    nock(url)
      .get('/')
      .once()
      .replyWithError(JSON.stringify({ message: 'Ahh I\'m a 5XX. You should try again!', code: 'Internal Error' }));

    nock(url)
      .get('/')
      .once()
      .reply(() => [200, 'Success!']);

    nock(url)
      .get('/')
      .reply(() => {
        expect(true).to.equal(false);
        return [404];
      });

    request({
      auth: config,
      url,
      timesToRetry: 2,
    }).then((response) => {
      expect(response).to.not.be.undefined;
      expect(response.statusCode).to.equal(200);
    });
  });
});
