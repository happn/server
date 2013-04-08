var http = require("http"),
	sax = require("sax"),
	db = app.db;


module.exports ={
	fetchSource : function(date, cb){
		var body = "",
			that = this;

		http.get({
		    host: app.config.rssFetchUrl,
		    path : app.config.rssFetchQuery,
		    port : app.config.rssFetchPort,
		  }, function(res){

		  	res.setEncoding('utf-8');
		  	res.on('data', function(chunk){
		  		body += chunk;
		  	}).on('end',function(){
		  		that.parse(body, date, cb);
		  	});
		  	
		  }).on('error', function(err){
		  	app.log(["[ERROR] while Fetching RSS", err], 'error');
		});
	},
	
	parse : function (data, date, cb){
		var parser = sax.parser(/*strict*/ false),
 			parsed = {},
 			lastData = [],
 			that = this;

		parser.onerror = function (e) {
			
			// clear the error
			parser.error = null
			parser.resume()
		};

		parser.ontext = function (t) {
			if(t !== " ")
				lastData.push(t);
		};

		parser.onopentag = function (node) {
			var lastNode = node,
				nodeDate,
				menu,
				additive;

			if(node.name === "ITEM" ){
				if( !/Speiseplan/.test(lastData[0]) ){
					
					nodeDate = parseFloat(lastData[0].split(',')[1].split('.').join(''));
					nodeDate = app.utils.eightDigits(nodeDate);
					menu = lastData[1].split('*');
			

					additive = menu[2].split('Kennzeichnung')[1];
					menu[2] = menu[2].replace('Kennzeichnung' + additive, '');
					
					parsed[nodeDate] = {
						menu_a : {
							title : menu[2],
							up_votes : [],
							down_votes : [],
							picture : {
								uploads : [],
								approved : null
							}
						},

						menu_b : {
							title : menu[1],
							up_votes : [],
							down_votes : [],
							picture : {
								uploads : [],
								approved : null
							}
						},

						additive : additive,
					}
				}
					
				lastData = [];
			}
		};
		
		parser.onend = function () {
			if( date in parsed){
				cb.call(cb, false, parsed[date], { _id : date });
			} else {
				cb.call(cb, true, null);
			}
			that.insertInDb(parsed);						
		};

		parser.write( this.clean(data) ).close();			
	},


	fetchDay : function(date, fn){
		var that = this,
			imagePath =  app.config.serverAdress +":"+ app.config.dbPort + "/" + app.config.dBase + "/" + date + "/",
			data;

		this.exists(date, function(exists, doc){
			
			if(!exists){
				data = {
						"menu_a": {
							"title":"Kein Angebot",
							"up_votes":0,
							"down_votes":0,
							"picture":""
						},
						"menu_b":{
							"title":"Kein Angebot",
							"up_votes":0,
							"down_votes":0,
							"picture":""
						}
					};

				doc = {
					_id : date
				};
			} else {
				data = {
					menu_a : {
						title : app.utils.parseHTML( doc.menu_a.title ),
						up_votes : doc.menu_a.up_votes.length ,
						down_votes : doc.menu_a.down_votes.length ,
                        picture : that.getPicture(doc, "menu_a") != "" ? imagePath + that.getPicture(doc, "menu_a") : ""
					},
					menu_b : {
						title : app.utils.parseHTML( doc.menu_b.title ),
						up_votes : doc.menu_b.up_votes.length ,
						down_votes : doc.menu_b.down_votes.length ,
                        picture : that.getPicture(doc, "menu_b") != "" ? imagePath + that.getPicture(doc, "menu_b") : ""
					},
				};
			}
			
			return fn.call(this, data, doc);
		});
	},

	getPicture : function(doc, menu){
	
		if(!doc._attachments || !doc[menu].picture.approved){
			return "";
		} 

		return  doc[menu].picture.approved;	
	},

	clean : function(data){
		data = data.replace(/\s+/g, ' ');

		//replace all line breaks, tabs, CData tags
		data = data.replace(/(\<b\>|\<\/b\>)/g, '__');

		data = data.replace(/\t|\n|\r|\<u\>|\<\/u\>|\<b\>|\<\/b\>/g, "");

		//replace all br with spaces
		data = data.replace(/(\<br\> \<br\>)+/g, '')
		data = data.replace(/\<br\>/g, "#");

		//replace all <u> with *
		data = data.replace(/(Menü 1|Menü 2)/g, "*");

		//data = data.slice( data.indexOf("</pubDate>") + 10);
		data = data.replace(/(\<\!\[CDATA\[|\]\]\>)/g, "");
		data = data.replace(/\n|\r/g, "");

		data = data.replace(/\s+/g, ' ');

		return data;
	},

	insertInDb : function (data){
		var that = this;

		for( var date in data){
			(function(d){
				that.exists(d, function(exists, doc){
					!exists && db.save(d, data[d], function(err){
						err && app.log(["[ERROR] while saving to Db", err], 'error');
					})
				});						
			})(date + "");			
		}
	},

	exists : function(key, cb, /* opt */ ctx){
		db.get(key, function(err, doc){
			if(err){
				if(err.error === "not_found"){
					cb.call(ctx || this, false, err )
				}
				else if(err.code === 'ECONNREFUSED' ){
					app.log("NO DB CONNECTION", 'warn');
					cb.call(ctx || this, false, err )
				}
				else /* TODO error Handling */
					cb.call(ctx || this, false, err )
			}
			 else {
				cb.call(ctx || this, true, doc);
			}
		});
	}
}
