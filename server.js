
app = {};

var express = require("express"),
  	cradle = require('cradle')
   	http = require('http'),
	utils = require(__dirname + "/utils"),
	RestRequest = require(__dirname + "/Request");
	api = {};

var config = {
	dbUrl : 'localhost',
	dbPort : 5984,
	dBase : 'hfuapp',
	dbUser : 'admin',
	dbpassword : '6W2epzXrXN',
	serverAdress : "http://78.46.19.228",
	httpServerPort : 8010,
	rssFetchUrl : 'www.studentenwerk.uni-freiburg.de',
	rssFetchQuery : '/index.php?id=855&no_cache=1&L=&Tag=0&Ort_ID=641',
	rssFetchPort : 80,
	serverAdress : "http://78.46.19.228",
	user : 'hfuclient',
	passphrase : '9204030321b3dfd8fa0dd4e0d28ed746',
};


app.start = function(){
	this.config = config;
	this.utils = utils;
	this.httpServer = express.createServer();
	this.auth = express.basicAuth(config.user, config.passphrase);
	this.httpServer.use(express.bodyParser());

	this.db =  new(cradle.Connection)(config.dbUrl, config.dbPort, {
      cache: false,
      secure: true,
      auth: { 
      	username: config.dbUser , 
      	password: config.dbpassword 
     }
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
		'/v1/picture' :['put', app.methods.pictureUpload]
	};

	api.fields = {
		'/v1/vote/:date' : {
			date : 'params.date',
			user : 'body.user',
			menu : 'body.menu',
			vote : 'body.vote'
		},
		'/v1/day/:date' : {
			date : 'params.date'
		},
		'/v1/week/:date' : {
			date : 'params.date'
		},
	};

	api.fieldRules = {
		date : function(s){
			return !/(\.|\:|\/)/g.test(s) && s.length === 8;
		},

		user : function(n){
			return true;
		},

		menu : function(s){
			return /a|b/.test(s);
		},

		vote : function(s){
			return /up|down/.test(s);
		}
	};

  	this.bindApi();
};

app.load = function(){
	app.methods = require(__dirname + "/methods");
};

app.validateRequest = function(action, path, request){
	var rules = api.fields[path],
		passed = 0,
		checks = 0;

	for ( var rule in rules ){
		checks++;

		var field = rules[rule].split('.'),
			val = request[field[0]][field[1]];

		if( val && api.fieldRules[rule](val) ){
			passed++;
		} 
	}
	
	return (checks === passed);
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
			server[action[0]](path, /*that.auth,*/ function(request, response){
				console.log(action[0], path);
				var r = new RestRequest(request, response),
					isValidRequest = app.validateRequest(action, path, r);
				
				if( isValidRequest ){
					r.setHeaders();
					return action[1].call(that, r);
				} else {
					r.exitWithError("Arguments invalid");
				}			
			});
		})(action, path, this.httpServer);		
	}
};

/*process.on('uncaughtException', function (err) {
  console.log('Caught exception: ' + err);
});*/

app.start();
