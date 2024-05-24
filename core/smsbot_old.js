/**
 * Created by divyanshverma on 10/22/15.
 */
// Your accountSid and authToken from twilio.com/user/account
var accountSid = '';
var authToken = "";
var client = require('twilio')(accountSid, authToken);

client.messages.create({
    body: "Jenny please?! I love you Ok",
    to: "+12039844378",
    from: "+12015913788"
}, function(err, message) {
    process.stdout.write(message.sid);
});
