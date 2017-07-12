const request = require('../../index');
const expect = require('chai').expect;
const nock = require('nock');
const Promise = require('bluebird');

describe('When a request is made', () => {
  const testUrl = 'http://www.example.com';
  const re = request.requestEmitter;
  const authConfig = {
    bearer: '12345',
  };

  const keyGenFunction = () => Promise.resolve('a');

  afterEach(() => {
    nock.cleanAll();
  });

  it('Should emit a request made event', (done) => {
    nock(testUrl)
    .get('/')
    .reply(200, {});

    const config = {
      method: 'GET',
      auth: authConfig,
      uri: testUrl,
      keyGen: keyGenFunction,
      timesToRetry: 1,
    };

    const validateEvent = (options) => {
      expect(options).to.not.be.undefined;
      expect(options.method).to.equal(config.method);
      expect(options.auth.bearer).to.equal(authConfig.bearer);
      re.removeListener(re.requestSentEvent, validateEvent);
      done();
    };

    re.on(re.requestSentEvent, validateEvent);
    request(config);
  });

  it('Should emit a response received event', (done) => {
    const replyStatusCode = 200;
    nock(testUrl)
    .get('/')
    .reply(replyStatusCode, { message: authConfig.bearer });

    const config = {
      method: 'GET',
      auth: authConfig,
      uri: testUrl,
      keyGen: keyGenFunction,
      timesToRetry: 1,
    };

    const validateEvent = (response) => {
      expect(response).to.not.be.undefined;
      expect(response.statusCode).to.equal(replyStatusCode);
      expect(response.body).to.not.be.undefined;
      expect(response.body.message).to.equal(authConfig.bearer);
      re.removeListener(re.responseReceivedEvent, validateEvent);
      done();
    };

    re.on(re.responseReceivedEvent, validateEvent);
    request(config);
  });
});
