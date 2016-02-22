/**
 * Created by divyanshverma on 11/12/15.
 */
'use strict';
const util = require('util');
const EventEmitter = require('events');
var xmpp = require('node-xmpp-client');
var uuid = require('node-uuid');
var _ = require("underscore");
var moment = require('moment');
var request = require('request');
var constants = require('constants');
var ltx = require('ltx');
_.str = require('underscore.string');
_.str.include('Underscore.string', 'string');
var sn_user = '501891528'
    , sn_password = 'SXF30gbj';
var _jar, queue = {},
    leaveRoomTime = 600000, //Set the time in ms before bot saves the queue to instance and leaves the chat room
    intervalUpdateTime = 120000, //Set the time in ms between updates to instance
    _cookieString, //Holds the jar/cookestring for posting data to sn instance
    proxyRequired = false,
    proxy = "",
    snInstance = "gedev.service-now.com";


var cb = function (error, response, body) {
    console.log(response.statusCode);
    console.log(error);
    console.log("Ticket updated")
};

function JabberBot() {
    // Initialize necessary properties from `EventEmitter` in this instance
    //EventEmitter.call(this);
    var connection = new xmpp.Client({
        jid: 'dev.servicenow@ge.com',
        password: 'P@ssw0rd',
        host: 'isj2cmx.webexconnect.com'
    });

    connection.on('online', function (data) {
        console.log(data)
        console.log('Connected as ' + data.jid.user + '@' + data.jid.domain + '/' + data.jid.resource)

        /***************************
         Incoming stanza:  {"name":"message","attrs":{"from":"chat289401844518445@conference.isj2.webex.com/pradeep.panwar@ge.com/jabber_402","id":"uid:55d71f89:00005a89:00000101","to":"dev.servicenow@ge.com/fcf8d927-50f6-4bef-bc32-713ac93ca3aa","type":"groupchat","xml:lang":"en","xmlns:stream":"http://etherx.jabber.org/streams"},"children":[{"name":"body","attrs":{},"children":["test 2 mins"]},{"name":"html","attrs":{"xmlns":"http://jabber.org/protocol/xhtml-im"},"children":[{"name":"body","attrs":{"xmlns":"http://www.w3.org/1999/xhtml"},"children":[{"name":"span","attrs":{"style":"font-family:Segoe UI;color:#1a1a1a;font-size:10pt;font-weight:normal;font-style:normal;text-decoration:none;"},"children":[{"name":"div","attrs":{},"children":["test 2 mins"]}]}]}]},{"name":"active","attrs":{"xmlns":"http://jabber.org/protocol/chatstates"},"children":[]},{"name":"x","attrs":{"xmlns":"http://jabber.org/protocol/muc#user"},"children":[{"name":"item","attrs":{"jid":"pradeep.panwar@ge.com/jabber_402"},"children":[]}]},{"name":"delay","attrs":{"from":"pradeep.panwar@ge.com/jabber_402","stamp":"2015-08-21T14:29:11.700854Z","xmlns":"urn:xmpp:delay"},"children":[]},{"name":"x","attrs":{"from":"pradeep.panwar@ge.com/jabber_402","stamp":"20150821T14:29:11.700854","xmlns":"jabber:x:delay"},"children":[]},{"name":"x","attrs":{"xmlns":"http://www.jabber.com/protocol/muc#history"},"children":[]}]}
         */

        connection.send(new xmpp.Element(
            'iq',
            {to: 'ge.com', type: 'get', id: uuid.v4()}
        ).c('query', {xmlns: "http://jabber.org/protocol/disco#info"}).up());

        connection.send(new xmpp.Element(
            'iq',
            {to: 'ge.com', type: 'get', id: uuid.v4()}
        ).c('query', {xmlns: "http://jabber.org/protocol/disco#items"}).up());

        connection.send(new xmpp.Element(
            'iq',
            {type: 'get'}
        ).c('query', {xmlns: "jabber:iq:roster"}).up());

        connection.send(new xmpp.Element(
            'iq',
            {to: 'ge.com', type: 'set', id: uuid.v4()}
        ).c('query', {xmlns: "http://jabber.org/protocol/disco#items"}).up());

        connection.send(new xmpp.Element(
            'iq',
            {to: 'consvr.isj2.webex.com', type: 'get', id: uuid.v4()}
        ).c('query', {xmlns: "http://jabber.org/protocol/disco#info"}).up());

        connection.send(new xmpp.Element(
            'iq',
            {to: 'aol-address-mapper.isj2.webex.com', type: 'get', id: uuid.v4()}
        ).c('query', {xmlns: "http://jabber.org/protocol/disco#info"}).up());

        connection.send(new xmpp.Element(
            'iq',
            {to: 'proxy.isj2.webex.com', type: 'get', id: uuid.v4()}
        ).c('query', {xmlns: "http://jabber.org/protocol/disco#info"}).up());

        connection.send(new xmpp.Element(
            'iq',
            {to: 'conference.isj2.webex.com', type: 'get', id: uuid.v4()}
        ).c('query', {xmlns: "http://jabber.org/protocol/disco#info"}).up());

        connection.send(new xmpp.Element(
            'presence',
            {}
        ).c('show').t('chat').up()
            .c('status').t('Available').up()
            .c('c', {
                xmlns: "http://jabber.org/protocol/caps", hash: "sha-1",
                node: "http://jabber.cisco.com/caxl",
                ver: "peSg/diinD4hk1+P8In1cxAYpfE="
            }).up());

        /*********************************
         * <presence xmlns='jabber:client'>
         <c xmlns='http://jabber.org/protocol/caps'
         hash='sha-1'
         node='http://jabber.cisco.com/caxl'
         ver='peSg/diinD4hk1+P8In1cxAYpfE='/>
         </presence>
         */

        intervalUpdate(); //Activate interval updates at every 90 Seconds

    });

    connection.on('stanza', function (stanza) {

        if (stanza.is('message') && stanza.attrs.type !== 'chat'
            && stanza.children[0].name === 'x' && stanza.children[1].name === 'invite') {//stanza.children[1].name === 'invite'

            console.log('children stanza: ', stanza.children[2].attrs.jid);

            //console.log('children stanza: ', stanza.children[1].name);

            var room = stanza.children[2].attrs.jid;
            var nick = 'dev.servicenow';
            connection.send(new xmpp.Element(
                'presence',
                {
                    to: room + '/' + nick,
                    from: 'dev.servicenow@ge.com/servicenow'
                }
            ).c('c', {
                xmlns: "http://jabber.org/protocol/caps", hash: "sha-1",
                node: "http://jabber.cisco.com/caxl",
                ver: "peSg/diinD4hk1+P8In1cxAYpfE="
            }).up()
                .c('x', {xmlns: "http://jabber.org/protocol/muc"}).up());

            var groupName = stanza.children[1].children[3].children[0]//stanza.children[2].children[0];

            var _to = stanza.attrs.from.toString();
            //var _to = f.substring(0, f.indexOf('/'));
            var _from = stanza.attrs.to;
            var _type = 'groupchat';
            queue[_to] = {};
            queue[_to].state = false;
            queue[_to].q = [];
            queue[_to].last = new Date();
            queue[_to].timeout = "";
            queue[_to].taskvalid = false;
            queue[_to].stopreaction = false;

            console.log('GroupName:' + groupName.substring(groupName.toString().toLowerCase().indexOf('inc'), 10));

            if (groupName.toString().toLowerCase().indexOf('inc') === -1) {//groupname does not contain INC1
                reply_dontKnow(_to, _from, _type)
            }
            else {

                queue[_to].task = groupName.substring(groupName.toString().indexOf('INC'), 10);
                console.log('TASK Found************: ' + queue[_to].task);
                if (queue[_to].task.length === 10) {
                    queue[_to].state = true;
                    var timeout = _setTimeOut(_to, _from, _type);
                    queue[_to].timeout = timeout;
                    reply_disclosure(_to, _from, _type);

                }
            }


        }

        if (stanza.is('message') && stanza.attrs.type === 'groupchat') {

            //console.log('Incoming stanza: ', JSON.stringify(stanza))

            var message = stanza.getChildText('body');
            message = _.str.trim(message)
            message = _.str.capitalize(message);

            if (stanza.attrs.from.toString().indexOf('/dev.servicenow@ge.com/') === -1)
                consume(stanza, message);


        }

        if (stanza.is('message') && stanza.attrs.type === 'chat') {
            //console.log('Incoming stanza: ', JSON.stringify(stanza))

            //console.log('Sending response: ' + stanza.root().toString())

            var message = stanza.getChildText('body');
            message = _.str.trim(message)
            message = _.str.capitalize(message);

            if (stanza.attrs.from.toString().indexOf('/dev.servicenow@ge.com/') === -1)
                consume(stanza, message);

        }

        if (stanza.is('iq') && stanza.attrs.type === 'get' && stanza.children[0].name === 'query') {
            console.log('Incoming stanza: ', JSON.stringify(stanza))
            //var _to = stanza.attrs.from;
            //var _from = stanza.attrs.to;
        }


    })

    connection.on('error', function (e) {
        console.error(e)
    });

    connection.connection.socket.setTimeout(0);

    connection.connection.socket.setKeepAlive(true, 10000);

    return connection;
};

module.exports = JabberBot;

function consume(stanza, message) {

    console.log('Incoming stanza: ', JSON.stringify(stanza))
    console.log('Message : ' + message)
    var from = "";
    var _to = stanza.attrs.from;
    var _from = stanza.attrs.to;
    var _type = 'chat';

    if (stanza.attrs.type === 'groupchat') {
        var f = stanza.attrs.from.toString();
        _to = f.substring(0, f.indexOf('/'));
        from = f.substring(f.indexOf('/') + 1, f.length);
        from = from.substring(0, from.indexOf('/'));
        if (from.length === 0)
            from = "";

        _type = 'groupchat';
    }

    if ((message.toLowerCase() === 'hi' || message.toLowerCase() === 'hello' || message.toLowerCase() === 'hi there') && _type === 'chat') {
        var reply = new ltx.Element('message', {
            to: _to,
            from: _from,
            type: _type
        })
        reply.c('body').t('Hello, I am a bot. How may I help you ?')//isNaN(i) ? '' : ('' + (i + 1))
        setTimeout(function () {
            connection.send(reply)
        }, 1000);
    }
    else if (message.length !== 0 && _type === 'groupchat' && _to !== "" && message.indexOf('<<') === -1) {
        var m = {};
        m.message = message
        m.time = new Date();
        m.from = from;

        if (queue[_to].state) {

            if (message.toLowerCase().indexOf('**save') > -1) {
                post(queue[_to].q, queue[_to].task, _to, _from, _type)
            }
            else if (message.toLowerCase().indexOf('**pause') > -1) {
                queue[_to].state = false;
                reply_paused(_to, _from, _type);
            }
            //else if (message.toLowerCase().indexOf('**exit') > -1) {
            //    queue[_to].q = [];
            //    delete queue[_to];
            //    leave_room(_to, _from);
            //}
            else {
                queue[_to].last = new Date();
                queue[_to].q.push(m);
            }
        }
        else {
            //if (message.toLowerCase().indexOf('**exit') > -1 && queue[_to].taskvalid) {
            //    queue[_to].q = [];
            //    delete queue[_to];
            //    leave_room(_to, _from);
            //}
            //else
            if (message.toLowerCase().indexOf('**resume') > -1 && queue[_to].taskvalid) {
                queue[_to].state = true;
                queue[_to].stopreaction = false;
                reply_resumed(_to, _from, _type);
            }
            else if (!queue[_to].taskvalid && !queue[_to].stopreaction) {//stopreaction
                reply_dontKnow(_to, _from, _type);
            }

        }

    }
    else if (message.indexOf('<<') > -1 && message.indexOf('>>') > -1 && _type === 'groupchat') {
        var sys_id = message.substring(message.indexOf("<<") + 2, message.indexOf(">>"));

        if (sys_id.length === 10 && sys_id.toLowerCase().indexOf('inc') > -1) {
            queue[_to].state = true;
            queue[_to].task = sys_id;
            queue[_to].taskvalid = true;
            reply_disclosure(_to, _from, _type);
            var timeout = _setTimeOut(_to, _from, _type);
            queue[_to].timeout = timeout;
        }
        else {
            reply_dontKnow(_to, _from, _type);
        }

    }
}

function post(q, n, _to, _from, _type) {

    console.log("Task to be saved " + n);
    console.log("Queue length:" + q.length);
    var userMessage = "";//JSON.stringify(q);

    _.each(q, function (element, index, list) {
        console.log(list[index].message + '    [' + list[index].from + '  -  ' + moment(list[index].time).format('YYYY-MM-DD HH:mm:ss') + ']\n');
        var newLine = list[index].message + '    [' + list[index].from + '  -  ' + moment(list[index].time).format('YYYY-MM-DD HH:mm:ss') + ']\n';
        userMessage = userMessage + newLine

    });

    var reply = new ltx.Element('message', {
        to: _to,
        from: _from,
        type: _type
    });

    console.log(_cookieString)

    var finalUpdate = function (_id) {

        var options = {
            uri: 'https://' + snInstance + '/api/now/v1/table/incident/' + _id + '?sysparm_exclude_ref_link=true',
            method: 'PUT',
            agent: false,
            strictSSL: false,
            rejectUnauthorized: false,
            secureOptions: constants.SSL_OP_NO_TLSv1_2,
            headers: {
                "Cookie": _cookieString,
                "Content-Type": "application/json",
                "CSP": "active",
                "DNT": "1",
                "Accept": "application/json"
            },
            auth: {
                user: sn_user,
                pass: sn_password,
                sendImmediately: false
            },
            time: true,
            json: true,
            body: {work_notes: userMessage} //Serialize and format q before posting
        };

        reply.c('body').t('Incident Updated\n');
        setTimeout(function () {
            connection.send(reply)

            try {
                queue[_to].q = [];
            }
            catch (e) {
                console.error('Something went wrong:537:' + e);
            }

        }, 321)

        process.nextTick(function () {

            request(options, cb);

        });

    }

    var getSysId = function () {

        var _cb = function (error, response, body) {
            console.log(response.statusCode);
            //console.log(JSON.stringify(body));
            //
            if (!_.isUndefined(body.error)) {
                console.log("Task not found:558:");
                queue[_to].taskvalid = false;
                queue[t].stopreaction = false;
                reply.c('body').t('Could not search the Incident. Please try again')
                    .t('\n');
                setTimeout(function () {
                    connection.send(reply)
                }, 321)
            }
            else if (!_.isUndefined(body.result)) {
                queue[_to].taskvalid = true;
                queue[_to].stopreaction = true;
                var _id = body.result[0].sys_id;
                finalUpdate(_id)
            }
            else {
                console.log("Task not found:570:");
                queue[_to].taskvalid = false;
                queue[t].stopreaction = false;
                reply.c('body').t('Could not search the Incident. Please try again')
                    .t('\n');
                setTimeout(function () {
                    connection.send(reply)
                }, 321)
            }

        }

        var options = {
            uri: 'https://' + snInstance + '/api/now/v1/table/incident?sysparm_query=number=' + n,
            method: 'GET',
            agent: false,
            strictSSL: false,
            rejectUnauthorized: false,
            secureOptions: constants.SSL_OP_NO_TLSv1_2,
            headers: {
                "Cookie": _cookieString,
                "Content-Type": "application/json",
                "CSP": "active",
                "DNT": "1",
                "Accept": "application/json"
            },
            auth: {
                user: sn_user,
                pass: sn_password,
                sendImmediately: false
            },
            time: true,
            json: true,
            body: {work_notes: userMessage}
        };

        process.nextTick(function () {
            request(options, _cb);
        });

    };

    if (q.length !== 0)
        getSysId();

};

function reply_dontKnow(t, f, _type) {
    queue[t].stopreaction = true;
    var reply = new ltx.Element('message', {
        to: t,
        from: f,
        type: _type
    });
    reply.c('body').t('Not able to capture the task number in Group Name. Please type the task number in following format :\n')
        .t('\n')
        .t('<<#>>\n')
        .t('Please note this chat will not be recorded without a valid Task #');
    setTimeout(function () {
        connection.send(reply)
    }, 621)
}

function reply_disclosure(t, f, _type) {
    queue[t].stopreaction = false;
    var reply = new ltx.Element('message', {
        to: t,
        from: f,
        type: _type
    });
    reply.c('body').t('Please be aware that this group chat will now be recorded. To stop recording, any group member can type **pause during the chat.')
    setTimeout(function () {
        connection.send(reply)
    }, 321)
}

function reply_paused(t, f, _type) {
    var reply = new ltx.Element('message', {
        to: t,
        from: f,
        type: _type
    });
    reply.c('body').t('Recording paused. Please type **resume to start recording.')
    setTimeout(function () {
        connection.send(reply)
    }, 321)
}

function reply_resumed(t, f, _type) {
    var reply = new ltx.Element('message', {
        to: t,
        from: f,
        type: _type
    });
    reply.c('body').t('Now recording this chat.')
    setTimeout(function () {
        connection.send(reply)
    }, 321)
}

function leave_room(t, f) {
    var reply = new ltx.Element('presence', {
        to: t,
        from: f,
        type: 'unavailable'
    })
    reply.c('status').t('Since you guys are being lazy to type anything, I am out of here! ')
    setTimeout(function () {
        connection.send(reply)
    }, 1000)
}

function _setTimeOut(_to, _from, _type) {
    var timeout = setTimeout(function () {
        try {
            console.log('Checking whether its time to leave the room...');
            var diff = moment().diff(moment(queue[_to].last));
            if (diff >= leaveRoomTime) {
                if (queue[_to].state)
                    post(queue[_to].q, queue[_to].task, _to, _from, _type);

                queue[_to].q = [];
                delete queue[_to];
                leave_room(_to, _from);

            } else {
                clearTimeout(queue[_to].timeout);
                timeout = _setTimeOut(_to, _from, _type);
                queue[_to].timeout = timeout;
            }
        }
        catch (e) {
            console.error('Something went wrong:645:' + e);
        }

    }, leaveRoomTime);

    return timeout;
}

function intervalUpdate() {//_to, _from, _type
    var interval = setInterval(function () {
        _.mapObject(queue, function (value, key) {
            if (!_.isUndefined(value.task) && value.q.length !== 0 && value.state) {
                try {
                    console.log('Checking whether its time to update...' + key);
                    post(value.q, value.task, key, key + '/dev.servicenow@ge.com', 'groupchat')
                    value.q = [];
                }
                catch (e) {
                    console.error('Something went wrong:663:' + e);
                }
            }


        })

    }, intervalUpdateTime);

    return interval;
}