/**
 * Created by divyanshverma on 10/22/15.
 */
// Your accountSid and authToken from twilio.com/user/account
var accountSid = 'AC1d94aca36cb1c20f58ddb80312e9208f';
var authToken = "b48c94cc5c85736255fd2f6a3ff0795d";
var client = require('twilio')(accountSid, authToken);

client.messages.create({
    body: "Jenny please?! I love you Ok",
    to: "+12039844378",
    from: "+12015913788"
}, function(err, message) {
    process.stdout.write(message.sid);
});