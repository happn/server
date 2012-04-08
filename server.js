var express = require("express"),
  	cradle = require('cradle')
  	db = new(cradle.Connection)('localhost', 5984, {
      cache: true,
      raw: false
  }).database('hfuapp'),
  	http = require('http'),
	httpServer = express.createServer(),
	sax = require("sax"),
	app = {};

	httpServer.use(express.bodyParser());


httpServer.post('/v1/vote/:date',function(req, res){
	var date = req.params.date,
		user = req.body.user,
		menu = req.body.menu,
		vote = req.body.vote,
		responseData = {};

	res.contentType('application/json');

	//TODO shitty if
	if(!date || !user || !menu || !vote){
		return res.end(JSON.stringify({
			date : date,
			success : false,
		}));
	}

	db.get(date, function(err, doc){
		if(err){
			return res.end(JSON.stringify({
				date : date,
				success : false,
			}));
		}

		doc[menu === "a" ? "menu_a" : "menu_b"][vote === "up" ? "up_votes" : "down_votes"].push(parseFloat(user));

		db.save(date, doc, function(err){
			if(err) console.warn(err);
		});

		responseData = {
			date : schwuchtify(date),
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


		};




		res.end(JSON.stringify(responseData));
	});


})

httpServer.get('/v1/showDay/:date', function(req, res){
	var responseData = {},
		date = parseFloat(req.params.date);

	res.contentType('application/json');


	if(req.params.date){
		db.get(req.params.date, function(err, doc){
			if(err){
				if(err.error === "not_found"){
					return app.fetch(date, function(err, result){
						if(err){
							responseData = {
								date : date,
									error : true,
									message : "Not in Date Range"
							}
						} else {
							result.date = schwuchtify(req.params.date);
							responseData =  result;

						}

						res.end(JSON.stringify(responseData));
					});
				} else{
					return console.warn("[ERROR] while fetching of Db", err)
				}
			}

				responseData =  {
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
						date : schwuchtify(date),


				};

				res.end(JSON.stringify(responseData));
		})
	}
});


httpServer.get('/v1/showWeek/:date', function(req, res){
	res.contentType('application/json');


	if(req.params.date){
		var days = getWeekDays(req.params.date),
			date = req.params.date,
			responseData = {},
			asycCount = days.length-1,
			fetching = false;

		for(var day = days.length-1; day > 0; day--){
			db.get(days[day], function(err, doc){
				if(err){
					asycCount--;
					checkAsync();

					if(err.error === "not_found"){
						// TODO we should fetch here
						/*if(fetching) return;
						fetching = true;

						app.fetch(days[day], function(err, result){
							if(err){
								responseData = {
									date : date,
									data : {
										error : true,
										message : "Not in Date Range"
									}
								}
							} else {							
								responseData = {
									date : date,
									data : result
								};
							}
							res.end(res.end(JSON.stringify(responseData)))
						});*/

					}
					return console.warn(err);
				}

				responseData[doc._id] = {
					menu_a : {
						title : doc.menu_a.title,
						up_votes : doc.menu_a.up_votes.length,
						down_votes : doc.menu_a.down_votes.length,
						picture : doc.menu_a.picture
					},
					menu_b : {
						title : doc.menu_b.title,
						up_votes : doc.menu_b.up_votes.length,
						down_votes : doc.menu_b.down_votes.length,
						picture : doc.menu_b.picture
					},
					date : schwuchtify( date),

				};

				checkAsync();
			});
		}

		function checkAsync(){

			if((asycCount -1) === 0){

				res.end(res.end(JSON.stringify( responseData )));
			} else {
				asycCount--;
			}
		}

	}



	function getWeekDays(date) {
	    var weekdays = [],
	        len = date.length,
	        target = new Date(date.slice(len - 6, len - 4) + "." + date.slice(0, len - 6) + "." + date.slice(len - 4, len)),
	        day = target.getDay(),
	        month = target.getMonth() + 1,
	        year = target.getFullYear(),
	        date = target.getDate(),
	        monday = 0;

	    day = day == 0 ? 6 : day - 1;

	    if (date - day > 0) {
	        monday = date - day;

	        for (var day = 0; day <= 6; day++) {
	            if (monday > getMaxDays(month, year)) {
	                monday = 1;
	                month++;
	                if (month > 12) {
	                    year++;
	                    month = 1;
	                }
	            }
	            weekdays[day] = [monday++, month, year].join('');
	        }
	        return weekdays;
	    } else {
	        for (var c = day; c > 0; c--) {
	            if ((date - 1) === 0) {
	                month--;
	                if (month === 0) year--;

	                date = getMaxDays(month, year);
	            } else {
	                date--;
	            }
	        }
	        return getWeekDays([date, month, year].join(''));
	    }


	    function getMaxDays(month, year) {
	        var isSchaltJahr = (year % 4 == 0) && (year % 100 != 0) || (year % 400 == 0),
	            isFeb = (month == 2),
	            isLongMonth = ((month <= 7) && (month % 2 != 0)) || ((month > 7) && (month % 2 == 0));

	        return (isFeb && isSchaltjahr) ? 29 : isFeb ? 28 : isLongMonth ? 31 : 30;
	    }
	}

});


app.fetch = function(date, cb){

	var body = "";

	 http.get({
	    host: "www.studentenwerk.uni-freiburg.de",
	    path : "/index.php?id=855&no_cache=1&L=&Tag=0&Ort_ID=641",
	    port : 80,
	  },function(res){
	  	res.setEncoding('utf8');  	
	  	res.on('data', function(chunk){
	  		body += chunk;
	  	});
	  	res.on('end',function(){
	  		parse(body);
	  	})

	  }).on('error',function(err){
	  	console.log("[ERROR] while Fetching RSS", err);
	  });

	function parse(data){

 		var parser = sax.parser(/*strict*/ false),
 			parsed = {},
 			lastData = [];

		parser.onerror = function (e) {
		   console.error("error!", e)
		  // clear the error
		  parser.error = null
		  parser.resume()
		};
		parser.ontext = function (t) {
				lastData.push(t);
		};
		parser.onopentag = function (node) {
			lastNode = node;
			if(node.name === "ITEM" ){
				if( lastData[0] !== "SpeiseplanMensaFurtwangen" ){
					parsed[parseFloat(lastData[0].split(',')[1].split('.').join(''))] = {
						menu_a : {
							title : lastData[1].split('*')[2],
							up_votes : [],
							down_votes : [],
							picture : ""
						},

						menu_b : {
							title : lastData[1].split('*')[4],
							up_votes : [],
							down_votes : [],
							picture : ""
						}
					}
				}



				lastData = [];
			}
		};

		parser.onend = function () {
			if( date in parsed){
				cb.call(cb, false, parsed[date]);
			} else {
				cb.call(cb, true, null);
			}

			insertInDb(parsed);						
		};

		data = data.replace(/\s+/g, '');

		//replace all line breaks, tabs, CData tags
		data = data.replace(/(\t|\n|\r|\<u\>\<\/u\>|\<b\>|\<\/b\>)/g, "");

		//replace all br with spaces
		data = data.replace(/(\<br\>\<br\>)+/g, '')
		data = data.replace(/\<br\>/g, " ");

		//replace all <u> with *
		data = data.replace(/(\<u\>|\<\/u\>)/g, "*");

		//data = data.slice( data.indexOf("</pubDate>") + 10);
		data = data.replace(/(\<\!\[CDATA\[|\]\]\>)/g, "");
		data = data.replace(/\n|\r/g, "");

		parser.write( data ).close();

	}

	function insertInDb(data){
		for( var date in data){
			(function(d){
				db.get(d, function(err, doc){
					if(err && err.error === "not_found"){
						db.save(d, data[d], function(err){
							err && console.log("[ERROR] while saving to Db", err);
						})
					}
				});
			})(date + "");			
		}


	}


}


httpServer.listen(8010, function(){
	console.log("Server listen at :8010")
});


function schwuchtify(date){
	//ensure string
	var out = date+"",
	parts = [];

	if(out.length === 7){
		out = "0"+ out;
	}
	parts.push(out.substring(2,4));
	parts.push( out.substring(0,2));
	parts.push(out.substring(4,8));
	return parts.join("/");

}


/*
	{user_id} [1000 - ∞] 
	{menu} [a,b]
	{Datum} 6122011


GET /v1/showDay/{Datum}

	=> {
		date : {Datum},
		data : {
			menu_a : {
				title : "Spaghettii",
				votes_down : 1234,
				votes_up : 12334,
				picture : null
			},

			menu_b : {
				title : "spaggrhe",
				votes_down : 12334,
				votes_up : 12234,
				picture : null
			}		
		}

	}

	GET /v1/showWeek

	=> {
		'montag' : {},
		'dienstag' : {},
		''

	}


	}



/v1/vote/{Datum}?user=1&menu=b&vote=up

POST /v1/vote/{Datum}?user={user_id}&menu= {menu}&vote={up, down}

	=> {
		date : {Datum},
		data : {
			success : [true, false],
			menu_a : {
				title : "Spaghettii",
				votes_down : 1234,
				votes_up : 12334,
				picture : null
			},

			menu_b : {
				title : "spaggrhe",
				votes_down : 12334,
				votes_up : 12234,
				picture : null
			}
		}
	}
*/