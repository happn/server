var async = require('async'),
	_ = require('underscore'),
	colors = require('colors');

var dataStruct = {
	date : null,
	menus : null
};

module.exports = function (id, db, callback){

	return function(err, data){
		if(err){
			return callback(err);
		}

		async.each(data.days, function( day, done ){
			var key = day.date.replace(/\./g, '') + "-" + id;

			day.menus.forEach(function(m, index){
				m.mid = key + "-" + index;
				m.pictures = [];
				m.likes = [];
			});

			db.save(key, _.extend(dataStruct, day), function(err){
				/*
				 * we dont propagte conflict error for now
				 */
				if(err && err.error === "conflict"){
					console.log("Document Update Conflict for: ".grey + key.yellow);
				} else if(err){
					console.log("DataAdapterError: ".grey + err.error.yellow);
				}

				done(null);
			});
		}, callback);		
	}
}