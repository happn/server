app = {};

var amon = require('amon').Amon,
	express = require("express"),
  	cradle = require('cradle')
   	http = require('http'),
	utils = require(__dirname + "/utils"),
	RestRequest = require(__dirname + "/Request");
	config = require('./config.js'),
	api = {};


app.start = function(){
	this.config = config;
	this.utils = utils;
	this.log  = console.log;
	this.httpServer = express();
	this.auth = express.basicAuth(config.user, config.passphrase);
	this.httpServer.use(express.bodyParser());
	
	//enable cross domain
	this.httpServer.use(function(req, res, next) {
  		res.header("Access-Control-Allow-Origin", "*");
  		res.header("Access-Control-Allow-Headers", "X-Requested-With");
  		next();
 	});

	this.db =  new(cradle.Connection)(config.dbUrl, config.dbPort, {
      cache: false,
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
		'/v1/vote/:date' : ["post", app.methods.vote],
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
		var field = rules[rule].split('.');

		var	val = request[field[0]][field[1]];

		if( val && api.fieldRules[rule](val) ){
			passed++;
		} else {
			app.log("Warn value:'"+val+"' is not valid for rule:'"+rule+"'", 'warn');
		} 
	}
	
	return (checks === passed);
};


app.bindHttp = function(){
	this.httpServer.listen(config.httpServerPort, function(){
		app.log("Server listen at :" + config.httpServerPort, 'info');
	});
};

app.bindApi = function(){
	var that = this;

	for(var path in api.routes){
		var action = api.routes[path];
		
		(function(action , path, server){
			server[action[0]](path, /*that.auth,*/ function(request, response){
				app.log(action[0] + ":" + path, 'info');

				var r = new RestRequest(request, response),
					isValidRequest = app.validateRequest(action, path, r);
				
				if( isValidRequest ){
					r.setHeaders();
					return action[1].call(that, r);
				} else {
					app.log("Request arguments invalid", 'warn');
					r.exitWithError("Arguments invalid");
				}			
			});
		})(action, path, this.httpServer);		
	}
};

process.addListener('uncaughtException', function(err) {
        amon.handle(err);
});

app.start();
