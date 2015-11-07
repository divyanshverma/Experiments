/**
 * Created by divyanshverma on 10/23/15.
 */
var express = require('express')
    ,uuid = require('node-uuid')
    ,_ = require("underscore")
    ,moment = require('moment')
    ,request = require('request')
    ,constants = require('constants')
    ,router = express.Router()
    ,twilio = require('twilio');

var sn_user = '501891528'
    ,sn_password = 'SXF30gbj'
    ,authToken = "dcc45773d88735753eaf70d442306b11"//"b48c94cc5c85736255fd2f6a3ff0795d"
    ,snInstance = "gedev.service-now.com"
    ,queue = {}
    ,accountSid = "AC16b983f4bafc602c1325a475aca8fb7c";//'AC1d94aca36cb1c20f58ddb80312e9208f';

var client = require('twilio')(accountSid, authToken);

/* GET users listing. */
router.get('/', function(req, res, next) {
    res.send('Sorry, your system has been hacked. Close this window right now or else......');
});

router.post('/', function(req, res, next) {
    if (twilio.validateExpressRequest(req, authToken)) {
        console.log(twilio.validateExpressRequest(req, authToken))
        console.log("Twilio Body" + JSON.stringify(req.body));
        consume(req.body);

    }
    else {
        res.send('you are not twilio.  Buzz off.');
    }
});

function consume(msg){
    var to = msg.From;

    if(_.isUndefined(queue[to])){
        queue[to] = {};
        queue[to].state = 0;
        queue[to].mc = 0;
    }

    if(msg.Body.toLowerCase() === "gehelp" ){

        if(_.isUndefined(queue[to].incident)){

            respond(to, "Thank you for contacting the GE Help Desk. You can cancel this request any time by replying with 'GESTOP'. Please wait while we locate your user profile.");

            var cb = function (error, response, body) {
                console.log("Status :" + response.statusCode);
                console.log("Error" + error);
                console.log("Body" + JSON.stringify(body));
                //respond(to, "");
                queue[to].state = 1;
                if(!_.isUndefined(body.result) && body.result.length > 0){
                    queue[to].state = 2;
                    return respond(to, "Is this " + body.result[0].user.display_value + " ? Reply 'Yes' or 'No'");
                } else {

                    //setTimeout(function(){
                        return respond(to, "We were unable to locate you, please reply with your SSO.");
                    //},2000);

                }
            };

            return actionQuery("cmn_notif_device", cb, "phone_numberLIKE" + to.substring(2));
        } else {
            return respond(to, "You already have an open incident " + queue[to].incidentNumber + ". Would you like to use the same incident ot create a new one ? Reply 'O' for old or 'N' for new.");
        }

    }

    if(msg.Body.toLowerCase() === "gestop" ){
        try{
            delete queue[to]
        } catch(e){
            console.log(e);
        }
        return respond(to, "Your request has been cancelled. Thank you for contacting GE Help Desk");
    }
    //check if SSO
    if(/^[0-9]{9}$/.test(msg.Body.toLowerCase()) && queue[to].state === 1){

        var cb = function (error, response, body) {
            console.log("Status :" + response.statusCode);
            console.log("Error" + error);
            console.log("Body" + JSON.stringify(body));
            //respond(to, "");
            if(!_.isUndefined(body.result) && body.result.length > 0){
                //queue[to] = {};
                queue[to].state = 2;
                return respond(to, "Is this " + body.result[0].user.display_value + " ? Reply 'Yes' or 'No'");
            } else {
                return respond(to, "We were unable to locate you, please contact Service Desk at 1-800-866-4513.");
            }
        };

         return actionQuery("cmn_notif_device", cb, "user.user_name=" + msg.Body.toLowerCase());
    }

    if(!/^[0-9]{9}$/.test(msg.Body.toLowerCase()) && queue[to].state === 1){

        queue[to].state = 1;
        return respond(to, "We were unable to locate you, please try again.");
    }

    if(msg.Body.toLowerCase() === "yes" && queue[to].state >= 2){

        if(queue[to].state === 2){
            queue[to].state = 3;

            var cb = function (error, response, body) {
                console.log("Status :" + response.statusCode);
                console.log("Error" + error);
                console.log("Body" + JSON.stringify(body));
                //respond(to, "");
                if(!_.isUndefined(body.result.number)){
                    queue[to].incident = body.result.sys_id;
                    queue[to].incidentNumber = body.result.number;
                    return respond(to, "Incident " + body.result.number + " has been created. What's the best method of contact? Reply 'P' for Phone or 'J' for Jabber or 'E' for email.");
                } else {
                    return respond(to, "Failed to create Incident, please contact Service Desk at 1-800-866-4513.");
                }
            };

            return actionPost("incident", cb, {});
        }

    }

    if(msg.Body.toLowerCase() === "no" && queue[to].state >= 2){
        if(queue[to].state === 2){
            try{
                delete queue[to]
            } catch(e){
                console.log(e);
            }
            return respond(to, "Please contact Service Desk at 1-800-866-4513.");
        }
    }

    if(msg.Body.toLowerCase() === "p"  && queue[to].state >= 3 ){
        queue[to].state = 4;
        setTimeout(function(){
            respond(to, "Would you like to input a description? If yes, please reply with description to you issue");
        },2000);
        return respond(to, "Thank you, an agent will contact you in approximately 3 hours via Phone - Cell");


    }

    if(msg.Body.toLowerCase() === "j"  && queue[to].state >= 3){
        queue[to].state = 4;
        setTimeout(function(){
            respond(to, "Would you like to input a description? If yes, please reply with description to you issue.");
        },2000);
        return respond(to, "Thank you, an agent will contact you in approximately 3 hours via Jabber");


    }

    if(msg.Body.toLowerCase() === "e"  && queue[to].state >= 3){
        queue[to].state = 4;
        setTimeout(function(){
            respond(to, "Would you like to input a description? If yes, please reply with description to you issue.");
        },2000);
        return respond(to, "Thank you, an agent will contact you in approximately 3 hours via Email");
    }

    if(!_.isUndefined(msg.MediaContentType0) && !_.isUndefined(msg.MediaUrl0) && queue[to].state >= 4) {
        console.log("Twilio Media Received");
        var fileExt = "";
        if(msg.MediaContentType0.indexOf('png') > -1)
            fileExt = ".png";
        if(msg.MediaContentType0.indexOf('jpeg') > -1)
            fileExt = ".jpeg";
        if(msg.MediaContentType0.indexOf('jpg') > -1)
            fileExt = ".jpg";
        if(msg.MediaContentType0.indexOf('3gpp') > -1)
            fileExt = ".3gp";

        fileExt = queue[to].mc + fileExt;

        queue[to].mc++;

        var cb = function (error, response, body) {
            console.log("Status :" + response.statusCode);
            console.log("Error" + error);
            console.log("Body" + JSON.stringify(body));
            if(!_.isUndefined(body.result)){
                return respond(to, "Media saved.");
            } else {
                return respond(to, "Saving media failed. Please call the GE Help Desk.");
            }
        };

        var getMediaCb = function(error, response, body){

            console.log("Status :" + response.statusCode);
            console.log("Error" + error);

            var base64Image = new Buffer(body).toString('base64');
            //console.log("Base64-Body" + JSON.stringify(base64Image));

            actionPostMedia("ecc_queue", cb, {
                base64Image: base64Image,
                contentType: msg.MediaContentType0,
                fileName: "mediaFile"+fileExt
            }, queue[to].incident);
        }

        return actionFetchMedia(msg.MediaUrl0, getMediaCb )

    }

    if(msg.Body.length !== 0 && queue[to].state >= 4){

        var cb = function (error, response, body) {
            console.log("Status :" + response.statusCode);
            console.log("Error" + error);
            console.log("Body" + JSON.stringify(body));
            //respond(to, "");
            if(!_.isUndefined(body.result.number)){
                return respond(to, "Description received, an agent will contact you in approximately 3 hours. Thank You.");
            } else {
                return respond(to, "Failed to update incident. Please contact Service Desk at 1-800-866-4513.");
            }
        };

        return actionPut("incident", cb, {
            short_description: msg.Body.substring(5, msg.Body.length)
        }, queue[to].incident);
    }

    respond(to, "Unrecognized input. Please try again.");
}

function respond(to, msg){
    client.messages.create({
        body: msg,
        to: to,
        from: "+18325434357",//"+12015913788"
    }, function(err, message) {
        process.stdout.write(message.sid);
    });
}

function actionFetchMedia(mediaUrl, cb){

    var options = {
        uri: mediaUrl,
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
        time: true,
        json: true
    };

    request(options, cb);
}

function actionPost(table, cb, data){
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

function actionPut(table, cb, data, _id){
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

function actionQuery(table, cb, query){
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

function actionPostMedia(table, cb, data, _id){

    data = {
        "agent":"AttachmentCreator",
        "topic":"AttachmentCreator",
        "source":"incident:" + _id,
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