process.title = "HappnServer";

app = {};

var express = require("express"),
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

	var settings = {
		cache : false
	};

	if(config.dbUser){
		settings.auth = { 
      		username: config.dbUser , 
      		password: config.dbpassword 
     	};
	}

	this.db =  new(cradle.Connection)(config.dbUrl, config.dbPort, settings);

  	//select db
  	this.db = this.db.database(config.dBase);

  	//start
  	this.bindHttp()
  	this.load();
  		

  	api.routes = {
		'/v2/like/:mid' : ["post", app.methods_v2.like],
		'/v2/unlike/:mid' : ["post", app.methods_v2.unlike],
		'/v2/week/:mensa_id/:date' : ["get", app.methods_v2.week],
		'/v2/post/:mid' : ["post", app.methods_v2.post],

		'/v1/vote/:date' : ["post", app.methods_v1.vote],
		'/v1/day/:date' : ["get", app.methods_v1.showDay],
		'/v1/week/:date' : ["get", app.methods_v1.showWeek],
		'/v1/picture' :['put', app.methods_v1.pictureUpload]
	};

	api.fields = {
		'/v2/like/:mid' : {
			mid : 'params.mid',
		},

		'/v2/unlike/:mid' : {
			mid : 'params.mid',
		},

		'/v2/week/:mensa_id/:date' : {
			date : 'params.date',
			mensa_id : 'params.mensa_id'
		},

		'/v2/post/:mid' : {
			mid : 'params.mid'
		},

		/* v1 api */

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

		mensa_id : function(s){
			return true;
		},

		mid : function(s){
			return true;
		},

		/* v1 - api */

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
	app.methods_v2 = require(__dirname + '/methods');
	app.methods_v1 = require(__dirname + '/methods.v1');
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
			app.log("Warn value:'"+ val+"' is not valid for rule:'"+rule+"'", 'warn');
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
			server[action[0]](path, function(request, response){
				app.log(action[0] + ":" + path, 'info');
				var is_v2 = path.indexOf('v2'); 

				var r = new RestRequest(request, response),
					isValidRequest = app.validateRequest(action, path, r);

				if(is_v2){
					r.options.version = 2;
				}
				
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
	console.log(err);
});

app.start();
