/**
 * Created by divyanshverma on 10/23/15.
 */
var express = require('express')
    , uuid = require('node-uuid')
    , _ = require("underscore")
    , moment = require('moment')
    , request = require('request')
    , constants = require('constants')
    , router = express.Router()
    , twilio = require('twilio');
var ltx = require('ltx');
var JabberBot = require("../core/JabberBot")();
var sn_user = 'updatebot'
    , sn_password = 'SXF30gbj'
    , authToken = "dcc45773d88735753eaf70d442306b11"
    , snInstance = "ge.service-now.com"
    , queue = {}
    , accountSid = "AC16b983f4bafc602c1325a475aca8fb7c"
    , responseDelay = 2000;

var options = {url: 'https://m1.cloudsifu.com/smsin'};

var repMsg = {
    one: "Thank you for contacting the GE Help Desk. You can cancel this request any time by replying with 'GESTOP'. Please wait while we locate your user profile.",
    oneFail: "We were unable to locate you, please reply with your SSO."

}
var client = require('twilio')(accountSid, authToken);

/* GET users listing. */
router.get('/', function (req, res, next) {
    res.status(404).send('Sorry, your system has been hacked. Close this window right now or else......').end();
});

router.post('/', function (req, res, next) {
    //console.log(JSON.stringify(req.body));
    if (twilio.validateExpressRequest(req, authToken, options)) {
        //console.log(twilio.validateExpressRequest(req, authToken))
        console.log("Twilio Body" + JSON.stringify(req.body));
        consume(req.body);

    }
    else {
        res.status(400).send('You are not twilio.  Buzz off.').end;
    }
});

function consume(msg) {
    var to = msg.From;
    var receivedBy = msg.To;
    var msgBody = msg.Body.toLowerCase();

    if (_.isUndefined(queue[to])) {
        queue[to] = {};
        queue[to].user = {};
        queue[to].user.email = "";
        queue[to].state = -1;
        queue[to].mc = 0;
        queue[to].pcm = 'p';
        queue[to].desc = '';
        queue[to].createNotifRecord = false;
    }

    var state = queue[to].state;

    if (msgBody === "help") {
        return respond(to, "GEHelpDeskAlerts: Help at CORPONEGEGLL1HELPDESK@ge.com or 800 868 4513. Msg&data rates may apply. 4 msgs/month. Reply STOP to cancel.", receivedBy);
    }

    if (msgBody === "stop") {
        return respond(to, "You are unsubscribed from GEHelpDeskAlerts. No more messages will be sent. Help at CORPONEGEGLL1HELPDESK@ge.com or 800 868 4513", receivedBy);
    }

    if (msgBody === "gehelp") {

        if (_.isUndefined(queue[to].incident) && queue[to].incident !== false) {

            respond(to, repMsg.one, receivedBy);

            var cb = function (error, response, body) {
                queue[to].state = 1;
                if (!_.isUndefined(body.result) && body.result.length > 0) {
                    console.log("Status :" + response.statusCode);
                    console.log("Body" + JSON.stringify(body));
                    queue[to].state = 2;
                    queue[to].user.value = body.result[0].user.value;
                    queue[to].user.display_value = body.result[0].user.display_value;

                    var setEmail = function (error, response, body) {
                        queue[to].user.email = body.result[0].email;
                        console.log("User email set : " + JSON.stringify(queue[to].user.email));
                    };

                    actionQuery("sys_user", setEmail, "sys_id=" + queue[to].user.value);

                    setTimeout(function () {
                        respond(to, "Is this " + body.result[0].user.display_value + " ? Reply 'Y' for yes or 'N' for no", receivedBy);
                    }, responseDelay);

                } else {
                    console.log("Error" + error);
                    setTimeout(function () {
                        respond(to, repMsg.oneFail, receivedBy);
                    }, responseDelay);
                }
            };

            return actionQuery("cmn_notif_device", cb, "type=SMS^phone_numberLIKE" + to.substring(2));
        } else {
            queue[to].state = 0;
            return respond(to, "You already have an open incident " + queue[to].incidentNumber + ". Would you like to use the same incident ot create a new one ? Reply 'O' for old or 'N' for new.", receivedBy);
        }

    }

    if (msgBody === "gestop") {

        var cb = function (error, response, body) {
            try {
                console.log("Status :" + response.statusCode);
                console.log("Error" + error);
                console.log("Body" + JSON.stringify(body));
                delete queue[to]
            } catch (e) {
                console.log(e);
            }
            respond(to, "Your incident has been cancelled. Thank you for contacting GE Help Desk", receivedBy);
        };

        if (!_.isUndefined(queue[to].incident) && queue[to].incident !== false) {

            return actionPut("incident", cb, {
                incident_state: "7"
            }, queue[to].incident);

        } else {

            try {
                delete queue[to]
            } catch (e) {
                console.log(e);
            }
            return respond(to, "There is no open incident to cancel. Please start over by replying GEHELP.", receivedBy);
        }
    }

    if (msgBody === "o" && state === 0) {
        queue[to].state = 6;
        if (receivedBy === "434357")
            return respond(to, "An agent will contact you soon. Meanwhile would you like to add a comment to the incident ticket? If yes, please reply with your comment.", receivedBy);
        else
            return respond(to, "An agent will contact you soon. Meanwhile would you like to add a comment or attachment to the incident ticket? If yes, please reply with your comment.", receivedBy);
    }

    if (msgBody === "n" && state === 0) {
        queue[to].incident = false;
        queue[to].incidentNumber = false;
        queue[to].state = 3;
        return respond(to, "What's the best method of contact? Reply 'P' for Phone or 'J' for Jabber or 'E' for email.", receivedBy);

    }

    if (/^[0-9]{9}$/.test(msgBody) && state === 1) {

        var cb = function (error, response, body) {
            //respond(to, "");
            if (!_.isUndefined(body.result) && body.result.length > 0) {
                console.log("Status :" + response.statusCode);
                console.log("Body" + JSON.stringify(body));
                //queue[to] = {};
                queue[to].state = 2;
                queue[to].user.fullname = body.result[0].user.display_value;
                queue[to].user.value = body.result[0].user.value;

                var setEmail = function (error, response, body) {
                    queue[to].user.email = body.result[0].email;
                    console.log("User email set : " + JSON.stringify(queue[to].user.email));
                };
                queue[to].createNotifRecord = true;

                actionQuery("sys_user", setEmail, "sys_id=" + queue[to].user.value);

                respond(to, "Is this " + body.result[0].user.display_value + " ? Reply 'Y' for Yes or 'N' for No.", receivedBy);
            } else {
                console.log("Error" + error);
                respond(to, "We were unable to locate you, please contact Service Desk at 1-800-866-4513.", receivedBy);
            }
        };

        return actionQuery("cmn_notif_device", cb, "user.user_name=" + msgBody);
    }

    if (!/^[0-9]{9}$/.test(msgBody) && state === 1) {

        queue[to].state = 1;
        return respond(to, "We were unable to locate you, please try again.", receivedBy);
    }

    if (msgBody === "y" && state >= 2) {

        if (queue[to].state === 2) {
            if (queue[to].createNotifRecord) {
                //console.log("create a SMS record in notif table");
                var _cb = function (error, response, body) {
                    if (!_.isUndefined(body.result)) {
                        console.log("Status :" + response.statusCode);
                        console.log("Error" + error);
                        console.log("CMN Device Create Body" + JSON.stringify(body));
                        queue[to].createNotifRecord = false;
                    }
                }
                actionPost("cmn_notif_device", _cb, {
                    phone_number: to.substring(2),
                    service_provider: "fc891d3d0a0a0a7a00d9d1d926533a72",
                    type: "SMS",
                    active: true,
                    user: queue[to].user.value
                });
            }
            queue[to].state = 3;
            return respond(to, "What's the best method of contact? Reply 'P' for Phone or 'J' for Jabber or 'E' for email.", receivedBy);
        }

    }

    if (msgBody === "n" && state >= 2) {
        if (queue[to].state === 2) {
            queue[to].createNotifRecord = false;
            try {
                delete queue[to]
            } catch (e) {
                console.log(e);
            }
            return respond(to, "Please contact Service Desk at 1-800-866-4513.", receivedBy);
        }
    }

    if (msgBody === "p" && state >= 3) {
        queue[to].state = 4;
        queue[to].pcm = 'Phone - Cell';
        return respond(to, "Please reply with a description of your issue.", receivedBy);
    }

    if (msgBody === "j" && state >= 3) {
        queue[to].state = 4;
        queue[to].pcm = 'Chat';
        return respond(to, "Please reply with a description of your issue.", receivedBy);
    }

    if (msgBody === "e" && state >= 3) {
        queue[to].state = 4;
        queue[to].pcm = 'Email';
        return respond(to, "Please reply with a description of your issue.", receivedBy);
    }

    if (msgBody.length !== 0 && state === 4) {

        queue[to].desc = msg.Body;

        var cb = function (error, response, body) {
            if (!_.isUndefined(body.result) && !_.isUndefined(body.result.number)) {
                console.log("Status :" + response.statusCode);
                console.log("Body" + JSON.stringify(body));

                queue[to].state = 5;
                queue[to].incident = body.result.sys_id;
                queue[to].incidentNumber = body.result.number;

                if (receivedBy === "434357")
                    respond(to, "Thank you. Incident " + body.result.number + " has been created. An agent will contact you soon. You can now close this SMS.", receivedBy);
                else
                    respond(to, "Thank you. Incident " + body.result.number + " has been created. An agent will contact you soon. Meanwhile would you like to add a comment or attachment to the incident ticket? If yes, please reply with your comment or attachment.", receivedBy);

                //var reply = new ltx.Element('message', {
                //    to: queue[to].user.email.value,
                //    from: "dev.servicenow@ge.com",
                //    type: "chat"
                //});
                //
                //reply.c("body").t("UpdateBot : Thank you. Incident " + body.result.number + " has been created. An agent will contact you soon.");
                //JabberBot.send(reply);

            } else {
                console.log("Error" + error);
                respond(to, "Failed to create Incident, please contact Service Desk at 1-800-866-4513.", receivedBy);
            }
        };

        return actionPost("incident", cb, {
            opened_by: queue[to].user.value,
            caller_id: queue[to].user.value,
            assignment_group: "@CORP ONEGE XL L1 Servicedesk",
            cmdb_ci: "helpdesk consult",
            short_description: "Via SMS: " + msg.Body,
            contact_type: "Customer Portal",
            description: msg.Body,
            u_preferred_contact_meathod: queue[to].pcm
            //"u_category": "application error",
            //"u_subcategory": "general error/exception"
        });
    }

    if (!_.isUndefined(msg.MediaContentType0) && !_.isUndefined(msg.MediaUrl0) && state >= 5) {
        console.log("Twilio Media Received");
        var fileExt = "";
        if (msg.MediaContentType0.indexOf('png') > -1)
            fileExt = ".png";
        if (msg.MediaContentType0.indexOf('jpeg') > -1)
            fileExt = ".jpeg";
        if (msg.MediaContentType0.indexOf('jpg') > -1)
            fileExt = ".jpg";
        if (msg.MediaContentType0.indexOf('3gpp') > -1)
            fileExt = ".3gp";

        fileExt = queue[to].mc + fileExt;

        queue[to].mc++;
        //queue[to].state = 6;

        var cb = function (error, response, body) {
            console.log("Status :" + response.statusCode);
            console.log("Body" + JSON.stringify(body));
            if (!_.isUndefined(body.result)) {
                respond(to, "Your attachment has been saved to Incident #" + queue[to].incidentNumber, receivedBy);
            } else {
                console.log("Error" + error);
                respond(to, "Saving attachment failed. Please call the GE Help Desk.", receivedBy);
            }
        };

        var getMediaCb = function (error, response, body) {

            console.log("Status :" + response.statusCode);
            console.log("Error" + error);
            //console.log("Media:" + body);
            var base64Image = new Buffer(body, "binary").toString('base64');
            //console.log("Base64-Body" + JSON.stringify(base64Image));
            actionPostMedia("ecc_queue", cb, {
                base64Image: base64Image,
                contentType: msg.MediaContentType0,
                fileName: "mediaFile" + fileExt
            }, queue[to].incident);
        }

        return actionFetchMedia(msg.MediaUrl0, getMediaCb)

    }

    if (msgBody.length !== 0 && state === 6 && msgBody !== "no") {

        var cb = function (error, response, body) {
            //respond(to, "");
            if (!_.isUndefined(body.result) && !_.isUndefined(body.result.number)) {
                console.log("Status :" + response.statusCode);
                console.log("Error" + error);
                console.log("Body" + JSON.stringify(body));
                respond(to, "Comment received, Thank You.", receivedBy);
            } else {
                respond(to, "Failed to update incident. Please contact Service Desk at 1-800-866-4513.", receivedBy);
            }
        };
        //substring(5, msg.Body.length)
        return actionPut("incident", cb, {
            comments: msg.Body
        }, queue[to].incident);
    }

    if (msgBody === "no" && state === 6) {
        return respond(to, "An agent will contact you soon. Thank you.", receivedBy);
    }

    respond(to, "Unrecognized input. Please try again, or start over by replying GEHELP.", receivedBy);
}

function respond(to, msg, receivedBy) {
    //Body{"ToCountry":"US","ToState":"TX","SmsMessageSid":"SM8d21846d25a72edb7f88347e1e971b39","NumMedia":"0","ToCity":"SPLENDORA","FromZip":"06850","SmsSid":"SM8d21846d25a72edb7f88347e1e971b39","FromState":"CT","SmsStatus":"received","FromCity":"NORWALK","Body":"Tyioooojjhhh","FromCountry":"US","To":"+18325434357","ToZip":"77372","NumSegments":"1","MessageSid":"SM8d21846d25a72edb7f88347e1e971b39","AccountSid":"AC16b983f4bafc602c1325a475aca8fb7c","From":"+12039844378","ApiVersion":"2010-04-01"}

    client.messages.create({
        body: msg,
        to: to,
        from: receivedBy//"434357",//"+12015913788"
    }, function (err, message) {
        process.stdout.write(message.sid);
    });
}

function actionFetchMedia(mediaUrl, cb) {

    var options = {
        uri: mediaUrl,
        method: 'GET',
        agent: false,
        strictSSL: false,
        rejectUnauthorized: false,
        encoding: "binary",
        secureOptions: constants.SSL_OP_NO_TLSv1_2,
        headers: {
            "Content-Type": "application/json",
            "CSP": "active",
            "DNT": "1",
            "Accept": "application/json"
        },
        time: true,
        json: true
    };

    request(options, cb);
}

function actionPost(table, cb, data) {
    var options = {
        uri: 'https://' + snInstance + '/api/now/v1/table/' + table,
        method: 'POST',
        agent: false,
        strictSSL: false,
        rejectUnauthorized: false,
        secureOptions: constants.SSL_OP_NO_TLSv1_2,
        headers: {
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
        body: data//{ work_notes: req.body.Body} //Serialize and format q before posting
    };

    request(options, cb);
}

function actionPut(table, cb, data, _id) {
    var options = {
        uri: 'https://' + snInstance + '/api/now/v1/table/' + table + '/' + _id,
        method: 'PUT',
        agent: false,
        strictSSL: false,
        rejectUnauthorized: false,
        secureOptions: constants.SSL_OP_NO_TLSv1_2,
        headers: {
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
        body: data//{ work_notes: req.body.Body} //Serialize and format q before posting
    };

    request(options, cb);
}

function actionQuery(table, cb, query) {
    var options = {
        uri: 'https://' + snInstance + '/api/now/v1/table/' + table + '?sysparm_display_value=all&sysparm_query=' + query,
        method: 'GET',
        agent: false,
        strictSSL: false,
        rejectUnauthorized: false,
        secureOptions: constants.SSL_OP_NO_TLSv1_2,
        headers: {
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
        json: true
    };
    request(options, cb);
}

function actionPostMedia(table, cb, data, _id) {

    data = {
        "agent": "AttachmentCreator",
        "topic": "AttachmentCreator",
        "source": "incident:" + _id,
        "name": data.fileName + ":" + data.contentType,
        "payload": data.base64Image
    };

    var options = {
        uri: 'https://' + snInstance + '/api/now/v1/table/' + table,
        method: 'POST',
        agent: false,
        strictSSL: false,
        rejectUnauthorized: false,
        secureOptions: constants.SSL_OP_NO_TLSv1_2,
        headers: {
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
        body: data//{ work_notes: req.body.Body} //Serialize and format q before posting
    };

    request(options, cb);
}

module.exports = router;
