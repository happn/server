
app = {};

var express = require("express"),
  	cradle = require('cradle')
   	http = require('http'),
	utils = require(__dirname + "/utils"),
	api = {};

var config = {
	dbUrl : 'localhost',
	dbPort : 5984,
	dBase : 'hfuapp',
	serverAdress : "http://78.46.19.228",
	httpServerPort : 8010,
	rssFetchUrl : 'www.studentenwerk.uni-freiburg.de',
	rssFetchQuery : '/index.php?id=855&no_cache=1&L=&Tag=0&Ort_ID=641',
	rssFetchPort : 80,
	user : 'hfuclient',
	passphrase : '9204030321b3dfd8fa0dd4e0d28ed746'
};


app.start = function(){
	this.config = config;
	this.utils = utils;
	this.httpServer = express.createServer();
	this.auth = express.basicAuth(config.user, config.passphrase);
	this.db =  new(cradle.Connection)(config.dbUrl, config.dbPort, {
      cache: true,
      raw: false
  	});

  	//select db
  	this.db = this.db.database(config.dBase);

  	//start
  	this.bindHttp()
  	this.load();
  		
  	api.routes = {
		'/v1/vote/:date' : ["get", app.methods.vote],
		'/v1/day/:date' : ["get", app.methods.showDay],
		'/v1/week/:date' : ["get", app.methods.showWeek],
		'/v1/picture'	: ["put", app.methods.pictureUpload]
	};

  	this.bindApi();
};

app.load = function(){
	app.methods = require(__dirname + "/methods");
};


app.bindHttp = function(){
	this.httpServer.listen(config.httpServerPort, function(){
		console.log("Server listen at :" + config.httpServerPort);
	});
};

app.bindApi = function(){
	var that = this;

	for(var path in api.routes){
		var action = api.routes[path];
		
		(function(action , path, server){
			server[action[0]](path, that.auth, function(request, response){
				console.log("request method: "+action[0], path);
				
				response.setHeader('content-type', 'application/json');
				return action[1].call(that, request, response);
			});
		})(action, path, this.httpServer);		
	}
};

/*process.on('uncaughtException', function (err) {
  console.log('Caught exception: ' + err);
});*/

app.start();
