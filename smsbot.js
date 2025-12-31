/**
 * Created by divyanshverma1222 on 10/22/15.
 */
// Your accountSid and authToken from twilio.com/user/account
var accountSid = ""
var authToken = ""
var client = require('twilio')(accountSid, authToken);

client.messages.create({
    body: "Jenny please?!",
    to: "+12039844378",
    messagingServiceSid: "MG05b1bb3d326986784869f7ec08dbe1e0"
    //from: "GEHELP"
}, function(err, message) {
    process.stdout.write(JSON.stringify(message));
});
//
//client.sms.shortCodes("SCe1cfede86d6c8b291d21149d1e499931").get(function(err, shortCode) {
//    console.log(JSON.stringify(shortCode));
//});

//client.sms.shortCodes("SCe1cfede86d6c8b291d21149d1e499931").update({
//    friendlyName: "GEHELP"
//}, function(err, shortCode) {
//    console.log(JSON.stringify(shortCode));
//});
