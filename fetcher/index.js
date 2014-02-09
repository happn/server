process.title = "HappnFetcher";

var request = require('request'),
	sax = require('sax'),
	cradle = require('cradle'),
	async = require('async'),
	_ = require('underscore'),
	colors = require('colors'),
	Parser = require('./mensaShitParser.js'),
	DataAdapter = require('./dataAdapter.js');

var config = require('./../config'),
	mensa_ids = Object.keys(config.mensen),
	buildUrl = function( id ){
		return config.rssUrl.replace("{#1}", id);
	},
	mensen_id = _.pluck(config.mensen, 'mensa_id'),
	dbSettings = {
		cache : false
	};

if(config.dbUser){
	dbSettings.auth = { 
  		username: config.dbUser , 
  		password: config.dbpassword 
 	};
}

//boot
console.log("Starting…".yellow);

// create db connection
var DbConnection =  new(cradle.Connection)(config.dbUrl, config.dbPort, dbSettings);

//select db
var db = DbConnection.database(config.dBase);

db.exists(function(err, exists){
	if(err && err.code === 'ECONNREFUSED'){
		console.log("Couldnt connect to Database - Exit".grey);
		process.exit(1);
	} else if(err){
		console.log("Database Error: %s, %s".grey, err.error, err.reason);
		process.exit(1);
	}

	if(!exists){
		console.log("Database '%s' was created".grey, config.dBase);
		db.create();
	} 

	// start a Parser for each mensa
	async.each(config.mensen, function( mensa, done ){
		var after =  new DataAdapter(mensa.id, db, done),
			url = buildUrl(mensa.mensa_id);

		new Parser(url, after);
		
	}, function(err, data ){
		if(err){
			console.log("Done with Error: %s".grey, err);
			process.exit(1);
		} else {
			console.log("Done!".yellow);
			process.exit(0);
		}
	})
});