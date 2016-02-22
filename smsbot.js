/**
 * Created by divyanshverma on 10/22/15.
 */
// Your accountSid and authToken from twilio.com/user/account
//var accountSid = 'AC1d94aca36cb1c20f58ddb80312e9208f';
var accountSid = "AC16b983f4bafc602c1325a475aca8fb7c"
//var authToken = "b48c94cc5c85736255fd2f6a3ff0795d";
var authToken = "dcc45773d88735753eaf70d442306b11"
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