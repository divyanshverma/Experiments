/**
 * Created by divyanshverma on 10/23/15.
 */
var express = require('express');
var uuid = require('node-uuid');
var _ = require("underscore");
var moment = require('moment');
var request = require('request');
var constants = require('constants');
_.str = require('underscore.string');
_.str.include('Underscore.string', 'string');

var router = express.Router();
var authToken = "b48c94cc5c85736255fd2f6a3ff0795d"
    ,twilio = require('twilio')
    ,snInstance = "gedev.service-now.com"
    ,_id= "0597a3f6012fd8008a8c61da88ccedbb";
var accountSid = 'AC1d94aca36cb1c20f58ddb80312e9208f';
var client = require('twilio')(accountSid, authToken);

/* GET users listing. */
router.get('/', function(req, res, next) {
    res.send('respond with a resource');
});

var cb = function (error, response, body) {
    console.log("Status :" + response.statusCode);
    console.log(error);
    console.log("Ticket updated")
};

router.post('/', function(req, res, next) {
    if (twilio.validateExpressRequest(req, authToken)) {
        console.log(twilio.validateExpressRequest(req, authToken))
        console.log(JSON.stringify(req.body.Body));
        //var resp = new twilio.TwimlResponse();
        //resp.say('express sez - hello twilio!');
        //
        //res.type('text/xml');
        //res.send(resp.toString());
        var options = {
            uri: 'https://' + snInstance + '/api/now/v1/table/incident/' + _id + '?sysparm_exclude_ref_link=true',
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
                user: '501891528',
                pass: 'SXF30gbj',
                sendImmediately: false
            },
            time: true,
            json: true,
            body: { work_notes: req.body.Body} //Serialize and format q before posting
        };


        request(options, cb);

        //var twiml = new twilio.TwimlResponse();
        //twiml.message('Sorry - there was an error processing your message.');
        //response.send(twiml);
        client.messages.create({
            body: "Incident updated",
            to: req.body.From,
            from: "+12015913788"
        }, function(err, message) {
            process.stdout.write(message.sid);
        });


    }
    else {
        res.send('you are not twilio.  Buzz off.');
    }
});

module.exports = router;