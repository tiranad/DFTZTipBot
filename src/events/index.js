const {EventEmitter} = require('events');

class PIVXEvents extends EventEmitter {}

module.exports = new PIVXEvents();
