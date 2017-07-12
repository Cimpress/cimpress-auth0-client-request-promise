const events = require('events');

const requestSentEvent = 'event:RequestSent';
const responseReceivedEvent = 'event:ResponseReceived';

class RequestEmitter extends events {
}

const requestEmitter = new RequestEmitter();

requestEmitter.requestSentEvent = requestSentEvent;
requestEmitter.responseReceivedEvent = responseReceivedEvent;

module.exports = requestEmitter;
