/**
 * Created by divyanshverma on 11/12/15.
 */
'use strict';
const util = require('util');
const EventEmitter = require('events');

function JabberBot() {
    // Initialize necessary properties from `EventEmitter` in this instance
    EventEmitter.call(this);
}

// Inherit functions from `EventEmitter`'s prototype
util.inherits(JabberBot, EventEmitter);
module.exports = JabberBot;