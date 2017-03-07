var request = require("request");

URL = 'http://catalyst.host.com/bots'
TOKEN = '349e512f-xxxx-xxxxx-81ab-xxxxxxx'
USERNAME = 'username'
PASSWORD = 'password'

var options = { method: 'GET',
  url: URL,
  headers: 
   { 'x-catalyst-auth': TOKEN,
     'content-type': 'application/json' },
  body: { username: USERNAME, pass: PASSWORD, authType: 'token' },
  json: true };

request(options, function (error, response, body) {
  if (error) throw new Error(error);

  console.log(body);
});
