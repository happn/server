var model = require(__dirname + "/models.js"),
	_ = require("underscore"),
	formidable = require('formidable'),
	db = app.db,
	fs = require('fs');

module.exports = {
	pictureUpload : function(request){
		var form = new formidable.IncomingForm(),
	        files = [],
	        fields = [];

	    form.uploadDir = __dirname + "/images";

	    form
	      .on('field', function(field, value) {
	        fields.push([field, value]);
	      })
	      .on('file', function(field, file) {
	        files.push([field, file]);
	      })
	      .on('end', function() {
	      	var path = files[0][1].path,
	      		menu = files[0][0];
	        
	        request.end();

	        fs.readFile(path, function (err, file) {
			  var now = app.utils.nowString();
			  if (err) 
			  	return console.log(err);

			  model.exists(now, function(exists, d, s){
			  	if(exists && d[menu].picture === ""){
			  		db.saveAttachment(now, {
			  			name : menu ,
			  			contentType : 'image/png',
			  			body : file
			  		}, function(err){
			  			if(err) console.warn(err);
			  			fs.unlink(path);
			  		});
			  	}
			  })

			});


	      });
	    form.parse(request.request);
	},

	vote : function(request){
		var db = this.db,
		date, user, menu, vote;
	

		db.get(date, function(err, doc){
			if(err){
				return res.end(JSON.stringify({
					date : date,
					data : {
						success : false,
					}
				}));
			}
			
			doc[menu === "a" ? "menu_a" : "menu_b"][vote === "up" ? "up_votes" : "down_votes"].push(parseFloat(user));

			db.save(date, doc, function(err){
				if(err) console.warn(err);
			});

			responseData = {
				date : app.utils.schwuchtify(date),
				data : {
					menu_a : {
						title : doc.menu_a.title,
						up_votes : doc.menu_a.up_votes.length ,
						down_votes : doc.menu_a.down_votes.length ,
						picture : doc.menu_a.picture
					},
					menu_b : {
						title : doc.menu_b.title,
						up_votes : doc.menu_b.up_votes.length ,
						down_votes : doc.menu_b.down_votes.length ,
						picture : doc.menu_b.picture
					},
				}
			};

			request.write(responseData);
			request.end();
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

	},
	
};

