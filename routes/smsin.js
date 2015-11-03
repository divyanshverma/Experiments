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
    //,_id= "0597a3f6012fd8008a8c61da88ccedbb";
    ,accountSid = "AC16b983f4bafc602c1325a475aca8fb7c";//'AC1d94aca36cb1c20f58ddb80312e9208f';

var client = require('twilio')(accountSid, authToken);

/* GET users listing. */
router.get('/', function(req, res, next) {
    res.send('respond with a resource');
});

//var cb = function (error, response, body) {
//    console.log("Status :" + response.statusCode);
//    console.log(error);
//    console.log("Ticket updated")
//};

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

//msg - req.body
function consume(msg){
    var to = msg.From;

    if(_.isUndefined(queue[to])){
        queue[to] = {};
        queue[to].state = 0;
    }

    if(msg.Body.toLowerCase() === "gehelp" ){

        if(_.isUndefined(queue[to].incident)){

            var cb = function (error, response, body) {
                console.log("Status :" + response.statusCode);
                console.log("Error" + error);
                console.log("Body" + JSON.stringify(body));
                //respond(to, "");
                queue[to].state = 1;
                if(!_.isUndefined(body.result) && body.result.length > 0){
                    respond(to, "Thank you for contacting the GE Help Desk. You can cancel this request any time by replying with 'GESTOP'. Please wait while we locate your user profile. Is this user full name (SSO) Reply Y1 for Yes or N1 for No.");
                    //queue[to] = {};

                } else {
                    //queue[to].state = 1;
                    respond(to, "Thank you for contacting the GE Help Desk. You can cancel this request any time by replying with 'GESTOP'. Please wait while we locate your user profile.");
                    setTimeout(function(){
                        return respond(to, "We were unable to locate you, please reply with your SSO.");
                    },2000);
                }
            };

            return actionQuery("cmn_notif_device", cb, "phone_numberLIKE" + to);
        } else {
            respond(to, "You already have an open incident " + queue[to].incidentNumber + ". Would you like to use the same incident ot create a new one ? Reply 'O' for old or 'N' for new.");
        }

    }

    //check if SSO
    if(/^[0-9]{9}$/.test(msg.Body.toLowerCase()) && queue[to].state >= 1){

        var cb = function (error, response, body) {
            console.log("Status :" + response.statusCode);
            console.log("Error" + error);
            console.log("Body" + JSON.stringify(body));
            //respond(to, "");
            if(!_.isUndefined(body.result) && body.result.length > 0){
                respond(to, "Is this " + body.result[0].email_address + " full name (SSO) Reply 'Yes' or 'No'");
                //queue[to] = {};
                queue[to].state = 1;
            } else {
                respond(to, "We were unable to locate you, please contact Service Desk at 1-800-866-4513.");
            }
        };

        return actionQuery("cmn_notif_device", cb, "user.user_name=" + msg.Body.toLowerCase());
    }

    if(!/^[0-9]{9}$/.test(msg.Body.toLowerCase()) && queue[to].state >= 1){

        queue[to].state = 0;
        return respond(to, "We were unable to locate you, please contact Service Desk at 1-800-866-4513.");
    }

    if(msg.Body.toLowerCase() === "yes" && queue[to].state >= 1){

        if(queue[to].state === 1){
            queue[to].state = 2;

            var cb = function (error, response, body) {
                console.log("Status :" + response.statusCode);
                console.log("Error" + error);
                console.log("Body" + JSON.stringify(body));
                //respond(to, "");
                if(!_.isUndefined(body.result.number)){
                    queue[to].incident = body.result.sys_id;
                    queue[to].incidentNumber = body.result.number;
                    respond(to, "Incident " + body.result.number + " has been created. What's the best method of contact? Reply 'Phone' or 'Jabber' or 'Email'.");
                } else {
                    respond(to, "Failed to create Incident, please contact Service Desk at 1-800-866-4513.");
                }
            };

            return actionPost("incident", cb, {});
        }

    }

    if(msg.Body.toLowerCase() === "no" && queue[to].state >= 1){
        if(queue[to].state === 1){
            queue[to].state = 0;
            try{
                delete queue[to]
            } catch(e){
                console.log(e);
            }
            return respond(to, "Please contact Service Desk at 1-800-866-4513.");
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

    if(msg.Body.toLowerCase().startsWith("desc:") && queue[to].state > 1){

        var cb = function (error, response, body) {
            console.log("Status :" + response.statusCode);
            console.log("Error" + error);
            console.log("Body" + JSON.stringify(body));
            //respond(to, "");
            if(!_.isUndefined(body.result.number)){
                respond(to, "Description received, an agent will contact you in approximately 3 hours. Thank You.");
            } else {
                respond(to, "Failed to update incident. Please contact Service Desk at 1-800-866-4513.");
            }
        };

        return actionPut("incident", cb, {
            short_description: msg.Body.substring(5, msg.Body.length)
        }, queue[to].incident);
    }

    if(msg.Body.toLowerCase() === "phone"  && queue[to].state > 1 ){
        respond(to, "Thank you, an agent will contact you in approximately 3 hours via Phone - Cell");
        setTimeout(function(){
            return respond(to, "Would you like to input a description? If yes, please reply with description to you issue. Start your response with desc:");
        },2000);

    }

    if(msg.Body.toLowerCase() === "jabber"  && queue[to].state > 1){
        respond(to, "Thank you, an agent will contact you in approximately 3 hours via Jabber");
        setTimeout(function(){
            return respond(to, "Would you like to input a description? If yes, please reply with description to you issue. Start your response with desc:");
        },2000);

    }

    if(msg.Body.toLowerCase() === "email"  && queue[to].state > 1){
        respond(to, "Thank you, an agent will contact you in approximately 3 hours via Email");
        setTimeout(function(){
            return respond(to, "Would you like to input a description? If yes, please reply with description to you issue. Start your response with desc:");
        },2000);

    }

}
//to req.body.From
function respond(to, msg){
    client.messages.create({
        body: msg,
        to: to,
        from: "+18325434357",//"+12015913788"
    }, function(err, message) {
        process.stdout.write(message.sid);
    });
}
//data - { work_notes: req.body.Body}
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
        uri: 'https://' + snInstance + '/api/now/v1/table/' + table + '?sysparm_query=' + query,
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

module.exports = router;