var model = require(__dirname + "/models.js"),
	_ = require("underscore"),
	db = app.db,
	fs = require('fs');

module.exports = {
	pictureUpload : function(request){
		var files = request.request.files,
			user = request.body.user;

		
		if(files){
			for(var file in files ){
				var path = files[file].path;

				fs.readFile(path, function (err, img) {
					var now = app.utils.nowString(),
				  		fileName = Date.now(); 
				  
				  if (err) 
				  	return app.log(['[pictureUpload] ReadFile Error during FileUpload ', err], 'error');


				  model.exists(now, function(exists, d){
				  	
				  	if(exists){
				  		db.saveAttachment({
				  			id: d._id, 
                            rev: d._rev
				  		}, {
				  			name : fileName + file,
				  			contentType : 'image/jpg',
				  			body : img
				  		}, function(err, doc){
				  			if(err) app.log(['[pictureUpload] Attachment Save Error', err], 'error');
				  			fs.unlink(path);

				  			doc[file].pictures.uploads.push({
				  				user : user,
				  				karma : 0,
				  				file : fileName + file
				  			});

				  			db.save(doc._id, doc._rev, doc);
				  		});


				  	} else {
				  		app.log("[pictureUpload] Image Exists", 'warn');
				  	}
				  })


				});
			}
		}

		request.end();
	},

	vote : function(request){
		var db = this.db,
			self = this,
			vote = request.body.vote,
			user = request.body.user,
			menu = request.body.menu,
			date = request.params.date;

		db.get(date, function(err, doc){
			if(err){
				return request.exitWithError("Date not in db");
			}
			
			if( !! doc[menu === "a" ? "menu_a" : "menu_b"][vote === "up" ? "up_votes" : "down_votes"].indexOf( user )) {
				doc[menu === "a" ? "menu_a" : "menu_b"][vote === "up" ? "up_votes" : "down_votes"].push( user );
			}


			db.save(date, doc, function(err){
				if(err) app.log(["while saving votes", err], 'error');
				self.methods.showDay(request);
			});	
		});
	},

	showDay : function(request){
		var date = app.utils.validateDate(request.params.date);
		
		model.fetchDay(date.toString(), function(data){
			request.write([{
				'date' : app.utils.schwuchtify(date),
				'menu_a' : data.menu_a,
				'menu_b' : data.menu_b
			}]);

			request.end();
		});

	},

	showWeek : function(request){
		var days = this.utils.getWeekDays(request.params.date),
			date = request.params.date,
			responseData = [],
			asycCount = days.length-1;

		for(var day = days.length-1; day >= 0; day--){					
			model.fetchDay(days[day], function(data, doc){
				data.date = doc._id;
				responseData.push(data);
				checkAsync();
			});
		}

		function checkAsync(){
			if((asycCount -1) === -1){
				responseData = _.sortBy(responseData, function(a){
					return parseFloat(a.date);
				});

				_.each(responseData, function(arr, i){
					responseData[i].date = app.utils.schwuchtify(responseData[i].date);
					request.write(responseData[i]);
				});

				return request.end();
			} else {
				asycCount--;
			}
		}
	}
};

var fetcher = {
	run : function(){
		var now = app.utils.getWeekDays(app.utils.nowString()),
			next = new Date(),
			diff = 0;

		app.log("Fetcher start", "info");
		
		model.fetchSource(now[0], function(err){
			app.log("Fetcher ended error:" + err , "info")
		});

		next.setHours(7);

		if( (next.getTime() - Date.now()) < 0){
			next = new Date(next.getTime() + 1000 * 60 * 60 * 24);
		}
		app.log("Fetcher scheduled for " + next , "info");

		setTimeout(function(){
			fetcher.run();
		}, next.getTime() - Date.now());
	}
};

fetcher.run();