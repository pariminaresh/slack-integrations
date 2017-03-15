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

//This API is to support Slack application OAUTH
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

//Entry point to the Slack Catalyst commands
app.post('/', (req, res) => {
  console.log("Request body:"+req.body);
  let text = req.body.text;
  console.log("Request body:"+req.body.response_url);
  console.log("Request body:"+text);

  var url = 'https://neocatalyst.rlcatalyst.com'
  var username = 'Admin2'
  var password = 'pass@123'

  var data = '';
  var executorBotData = '';

	var executorBotName = '';
  var executorBotParams = '';

  if(text.includes('help')){
    text = 'help'
  }else if(text.includes('executeBot')){
    executorBotData = text.match(/executeBot (.+)/i);
    console.log("executeBotId:"+executorBotData[1]);
		var tmp = executorBotData[1]
		executorBotName = tmp.split('(')[0]
    executorBotParams = tmp.slice(tmp.indexOf('(')+1, tmp.indexOf(')'))
    console.log('executorBotName: '+executorBotName)
		console.log('executorBotParams: '+executorBotParams)
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
					if(err){
						console.log("Error in getCatalystAuthToken")
						return
					}
          var auth_token = result;
          console.log('Auth token:'+auth_token);
          postBotList(req.body.response_url,url,auth_token,function(error,res){
               if(error){
								 console.log("Error in postBotList")
								 return
							 }
							 console.log("Success!")
					});
      });
        break;
    case 'executeBot':
        data = {
          response_type : 'in_channel',
          text: 'Executing bot:'
        };

        if(!executorBotData[1]){
          data.text = 'Please provide bot ID'
        }else{
            getCatalystAuthToken(url, username, password,function(err, result){
            var auth_token = result;
            postBotExecute(req.body.response_url,auth_token,url,executorBotName,executorBotParams,function(error,res){
							if(error) {
								console.error(error)
								return
							}
							console.log(res)
						});
          });
        }
        break;
    case 'help':
        data = {
          response_type : 'in_channel',
          text: 'Commands available: /catalyst listBots,  /catalyst executeBot <BotName> (InputParamters)'
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

//Description:: This function gets authentication token to interact with Catalyst
//Parameters::
//  url: Catalyst URL
//  username: Catalyst username
//  password: Catalyst password
function getCatalystAuthToken(url, username, password,callback){
  var auth_token = '';
	url = url+'/auth/signin'
  console.log(url+", "+username)
  var options = { method: 'POST',
    url: url,
    headers:
     { 'content-type': 'application/json' },
    body: { username: username, pass: password, authType: 'token' },
    json: true };

  request(options, function (error, response, body) {
    if(error) {
			console.log('error::'+error)
			callback(error, null);
			return;
		}
    console.log('response:'+response)
    auth_token = body.token;
    console.log("Authenticated Successfully " + auth_token);

    callback(null, auth_token);
    return
  });
}

//Description:: This function gets Bot list from Catalyst and posts to the Slack
//Parameters::
//  response_url: Slack URL that comes part of the request and can post back the response within 30minutes.
//  url: Catalyst URL
//  auth_token: Catalyst auth_token obtaines from getCatalystAuthToken()
function postBotList(response_url,url,auth_token,callback){
	url = url+'/bots'
  console.log('Firing url:'+url)

  var options = { method: 'GET',
    url: url,
    headers:
     {'x-catalyst-auth': auth_token,
       'content-type': 'application/json' },
  //  body: { username: 'Admin2', pass: 'pass@123', authType: 'token' },
    json: true };

  request(options, function (error, response, body) {
    if(error) {
			console.error(error)
			callback(error, null);
			return
    }

		if(body.bots){
			console.log("Gettting bots:");
	    var botList = body.bots;
	    var bots = "";
			bots += "S.No \t : \tBot Name\t : \tBot Type\t : \tInput Parameters\n"
			bots += "--------------------------------------------------------------------------------\n"

	    for (var i = 0; i < botList.length; i++) {
				var botConfig = botList[i].botConfig
				//console.log('BotName:'+botList[i].botName + '\n')

				if(botConfig && botConfig.taskType){
          //console.log(' --tastType:'+botConfig.taskType)
					var attributes = ''
					if(botConfig.taskType == 'chef'){
						attributes = botConfig.attributes
						//console.log('  --chef:' + attributes)
					}else if (botConfig.taskType == 'jenkins') {
            attributes = botConfig.parameterized
						//console.log('  --jenkins:' + attributes)
					}else if (botConfig.taskType == 'script') {
            attributes = botConfig.scriptDetails[0].scriptParameters
						//console.log('  --script:' + attributes)
					}

				if(attributes && attributes.length>0){
				  var attr = []

					for(var j = 0; j < attributes.length; j++){
						if(botConfig.taskType == 'script'){
              attr.push(attributes[j].paramDesc)
						}else{
							attr.push(attributes[j].name)
						}
					}

					bots += (i+1) + '\t:\t' + botList[i].botName+'\t:\t'+botConfig.taskType+'\t:\t'+attr.toString()+' \n'
			  }else{
					bots += (i+1) + '\t:\t' + botList[i].botName+'\t:\t'+botConfig.taskType+'\t:\t'+'No Input Parameters \n'
				}
			 }else{
				 bots += (i+1) + '\t:\t' + botList[i].botName+'\t:\t'+ 'None' +'\t:\t'+'No Input Parameters \n'
			 }
	    }

	    var data = "Bot List:\n"+bots;
	    postToSlack(response_url, data);

	    callback(null, "Success");
	 }else{
		 console.log("No bots found in the responce body");
		 callback("No Bots Found", null);
		 return
	 }
  });
}

//Description:: This function triggers Catalyst bot execution and posts the response to the Slack
//Parameters::
//  response_url: Slack URL that comes part of the request and can post back the response within 30minutes.
//  auth_token: Catalyst auth_token obtaines from getCatalystAuthToken()
//  url: Catalyst URL
//  executorBotName: Bot Name to be executed
//  executorBotParams: Input parameters that Bot accepts to execute
function postBotExecute(response_url,auth_token,url,executorBotName,executorBotParams,callback){
	executorBotName = executorBotName.trim();
	executorBotParams = executorBotParams.split(",")
  console.log("PostBotExecute::"+executorBotName);
  console.log("executorBotParams::"+executorBotParams);

 //http://neocatalyst.rlcatalyst.com/bots?filterBy=botName:Servicenow Ticket Creation
  var filterURL = url + '/bots?filterBy=botName:' + executorBotName

	console.log('filterURL:' + filterURL)

	var options = { method: 'GET',
		url: filterURL,
		headers:
		 {'x-catalyst-auth': auth_token,
			 'content-type': 'application/json' },
		json: true };

	request(options, function (error, response, body) {
		if(error) {
			console.error(error)
			postToSlack(response_url, "Catalyst is down");
			callback(error, null);
			return
		}

		if(!body.bots[0].botId){
			console.log("No Bot with Name:" + executorBotName);
			return;
		}
		var botId = body.bots[0].botId
		console.log('Bot ID::' + botId)

    var jsonBody = {};
		jsonBody.scriptParams = body.bots[0].botConfig.scriptDetails

		if(executorBotParams){
			console.log("In json formatting")
			var params = jsonBody.scriptParams[0].scriptParameters
      for( var i=0; i<params.length; i++){
				console.log(params[i].paramVal+':'+executorBotParams[i])
        params[i].paramVal = executorBotParams[i]
			}
		}
		var executeURL = url+'/bots/'+botId+'/execute'
	  console.log(executeURL);
		console.log('jsonBody:' + JSON.stringify(jsonBody))

	  var options = { method: 'POST',
	    url: executeURL,
	    headers:
	     { 'x-catalyst-auth': auth_token,
	       'content-type': 'application/json' },
	    body: jsonBody,
	    json: true };

	  request(options, function (error, response, body) {
			if(error) {
				console.error(error)
				callback(error, null);
				return
			}

	    console.log("Execute bot Response :"+body.botId);

	    var data = "Successfully triggered bot execution";
	    postToSlack(response_url, data);

	    callback(null, "Success")
		});
  });
}

//Description:: Posts the response back to Slack
//Parameters::
//   response_url: Slack URL that comes part of the request and can post back the response within 30minutes.
//   data: Any response string you want to show in Slack
function postToSlack(response_url, data){
    var options = { method: 'POST',
      url: response_url,
      body: { response_type : 'in_channel', text: data },
      json: true };

    request(options, function (error, response, body) {
      if (error) throw new Error(error);

    });
}
