'use strict';
const express = require('express'); 
const bodyParser = require('body-parser'); 
const app = express(); 

app.use(bodyParser.json()); 
app.use(bodyParser.urlencoded({ extended: true })); 

const server = app.listen(3001, () => { 
	 console.log('Express server   listening on port %d in %s mode', server.address().port,   
	 	app.settings.env);
	});

app.post('/', (req, res) => { 
  console.log("Request body:"+req.body)
  let text = req.body.text; 
  // implement your bot here ... 

  if(! /^\d+$/.test(text)) { // not a digit 
    res.send('U R DOIN IT WRONG. Enter a status code like 200!');   return; 
  }
  
  let data = { 
	  response_type: 'in_channel', // public to the channel 
	  text: '302: Found', 
	  attachments:[ { 
	    image_url: "https://http.cat/"+text+".jpg"
	  } ]};

  res.json(data);
});
