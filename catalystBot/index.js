'use strict';
const express = require('express');
const bodyParser = require('body-parser');
const app = express();
require('dotenv').config();
var request = require('request');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const server = app.listen(3003, () => {
	 console.log('Express server listening on port %d in %s mode', server.address().port,
	 	app.settings.env);
});

app.get('/auth/redirect', (req, res) =>{
    var options = {
        uri: 'https://slack.com/api/oauth.access?code='
            +req.query.code+
            '&client_id='+process.env.CLIENT_ID+
            '&client_secret='+process.env.CLIENT_SECRET+
            '&redirect_uri='+process.env.REDIRECT_URI,
        method: 'GET'
    }
    request(options, (error, response, body) => {
        var JSONresponse = JSON.parse(body)
        if (!JSONresponse.ok){
            console.log(JSONresponse)
            res.send("Error encountered: \n"+JSON.stringify(JSONresponse)).status(200).end()
        }else{
            console.log(JSONresponse)
            res.send("Success!")
        }
    })
})

app.post('/', (req, res) => {
  console.log("Request body:"+req.body);
  let text = req.body.text;
  console.log("Request body:"+req.body.response_url);
  console.log("Request body:"+text);
  
  var url = 'http://catalyst.host.com/bots'
  var username = 'username'
  var password = 'password'

  var data = '';
  var executorBotId = '';

  if(text.includes('help')){
    text = 'help'
  }else if(text.includes('executeBot')){
    executorBotId = text.match(/executeBot (.+)/i);
    console.log("executeBotId:"+executorBotId[1]);
    text = 'executeBot';
  }

  switch(text) {
    case 'listBots':
        data = {
          response_type : 'in_channel',
          text: 'Fetching Bot List:'
        };
        //var auth_token = getCatalystAuthToken(url, username, password);
        getCatalystAuthToken(url, username, password,function(err, result){
          var auth_token = result;
          console.log('Autosc:;'+auth_token);
          postBotList(req.body.response_url,url,auth_token);
      });
        break;
    case 'executeBot':
        data = {
          response_type : 'in_channel',
          text: 'Executing bot:'
        };

        if(!executorBotId[1]){
          data.text = 'Please provide bot ID'
        }else{
            getCatalystAuthToken(url, username, password,function(err, result){
            var auth_token = result;
            postBotExecute(req.body.response_url,auth_token,url,executorBotId[1]);
          });
        }
        break;
    case 'help':
        data = {
          response_type : 'in_channel',
          text: 'Commands avaiable: /catalyst listBots,  /catalyst executeBot <BotId>'
        };
        break;
    default:
        data = {
          response_type : 'in_channel',
          text: 'Check Usage of /catalyst --help commands'
        };
  }

  res.send(data);
});

function getCatalystAuthToken(url, username, password,callback){
  var auth_token = '';
  console.log(url+", "+username)
  var options = { method: 'POST',
    url: url+'/auth/signin',
    headers:
     { 'content-type': 'application/json' },
    body: { username: username, pass: password, authType: 'token' },
    json: true };

  request(options, function (error, response, body) {
    if(error) callback(error, null);

    auth_token = body.token;
    console.log("Authenticated Successfully " + auth_token);

    callback(null, auth_token);
    //return auth_token;
  });
}

function postBotList(response_url,url,auth_token,callback){
  var options = { method: 'GET',
    url: url+'/bots',
    headers:
     { //'postman-token': '3eb058ea-7ae7-3352-adbf-a02a55adb745',
       //'cache-control': 'no-cache',
       'x-catalyst-auth': auth_token,
       'content-type': 'application/json' },
  //  body: { username: 'Admin2', pass: 'pass@123', authType: 'token' },
    json: true };

  request(options, function (error, response, body) {
    if(error) callback(error, null);

    console.log("Gettting bots:"+body.bots);

    var botList = body.bots;

    var bots = [];
    for (var i = 0; i < botList.length; i++) {
      bots.push(botList[i].botName+':'+botList[i].botId+'\n')
    }

    var data = "Bot List:\n"+bots;
    post(response_url, data);

    //callback(null, "Success");
  });
}

function postBotExecute(response_url,auth_token,url,botId,callback){
  console.log("PostBotExecute::"+botId);
  var url = 'http://neocatalyst.rlcatalyst.com/bots/'+botId+'/execute'
  console.log(url);

  var options = { method: 'POST',
    url: url,
    headers:
     { //'postman-token': '3eb058ea-7ae7-3352-adbf-a02a55adb745',
       //'cache-control': 'no-cache',
       'x-catalyst-auth': auth_token,
       'content-type': 'application/json' },
  //  body: { username: 'Admin2', pass: 'pass@123', authType: 'token' },
    json: true };

  request(options, function (error, response, body) {
    if(error) callback(error, null);

    console.log("Execute bot Response :"+body.botId);

    var data = "Successfully triggered bot execution";
    post(response_url, data);

    //return callback(null, "Success");
  });
}

function post(response_url, data){
    var options = { method: 'POST',
      url: response_url,
      body: { response_type : 'in_channel', text: "Response::"+data },
      json: true };

    request(options, function (error, response, body) {
      if (error) throw new Error(error);

    });
}
