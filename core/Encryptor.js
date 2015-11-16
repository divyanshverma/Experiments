/**
 * Created by divyanshverma on 8/20/14.
 */
"use strict";
var crypto = require('crypto');
var _ = require("underscore");
_.str = require('underscore.string');
_.str.include('Underscore.string', 'string');


var Encryptor = module.exports.Encryptor = function (ob) {
    this.ob = ob;
    this.algorithm = ob.secure.algorithm;
    this.password = ob.secure.secret;
};

Encryptor.prototype.constructor = Encryptor;

Encryptor.prototype.encrypt = function (text, cb) {
    var cipher = crypto.createCipher(this.algorithm, this.password)
    var crypted = cipher.update(text, 'utf8', 'hex')
    crypted += cipher.final('hex');
    if (!_.isUndefined(cb))
        cb(crypted);
    else
        return crypted
};

Encryptor.prototype.decrypt = function (text, cb) {
    var self = this
    text = _.str.trim(text);
    var decipher = crypto.createDecipher(this.algorithm, this.password)
    try {
        var dec = decipher.update(text, 'hex', 'utf8')
        dec += decipher.final('utf8');

        if (!_.isUndefined(cb))
            cb(dec);
        else
            return dec;
    }
    catch (e) {
        if(e) throw e;

        cb(text);
    }
};
