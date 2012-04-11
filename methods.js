var model = require(__dirname + "/models.js"),
	db = app.db;

module.exports = {
	vote : function(req, res){
		var date = req.params.date,
			user = req.query.user,
			menu = req.query.menu,
			vote = req.query.vote,
			db = this.db;
			responseData = {};
		

		//TODO shitty if
		if(!date && user && menu && vote){
			return res.end(JSON.stringify({
				date : date,
				data : {
					success : false,
				}
			}));
		}

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

			res.end(JSON.stringify(responseData));
		});

		
	},

	showDay : function(req, res){
		var responseData = [],
			date = app.utils.validateDate(req.params.date);

		if(date){
			model.fetchDay(date.toString(), function(data){
				data.date = app.utils.schwuchtify(date);
				responseData.push(data);

				res.end(JSON.stringify({
					success : 1,
					version : 1,
					data : responseData
				}));
			});
		}
	},

	showWeek : function(req, res){

		if(req.params.date){			
			var days = this.utils.getWeekDays(req.params.date),
				date = req.params.date,
				responseData = [],
				asycCount = days.length-1,
				fetching = false,
				db = this.db;
			
			for(var day = days.length-1; day > 0; day--){
				
				model.fetchDay(days[day], function(data, doc){
					data.date = app.utils.schwuchtify(doc._id);
					responseData.push(data);
					checkAsync();
				});
			}

			function checkAsync(){
				if((asycCount -1) === 0){
					res.end(JSON.stringify({
						success : true,
						version : 1,
						data : responseData
					}));
				} else {
					asycCount--;
				}
			}
		}
	}
};