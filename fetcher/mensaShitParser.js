var request = require('request'),
	sax = require('sax'),
	colors = require('colors');

//const
var TITLE = "TITLE";
var DESC = "DESCRIPTION";
var ITEM = "ITEM";
var U = "U";
var B = "B";

function MensaShitParser( url, callback ){
	this.data = null;
	this.url = url;
	this.callback = callback;
	
	this.parser = sax.parser(false);
	
	this.parser.onerror = function(){
		this.parser.error = null;
		this.parser.resume();
	};
	
	this.download();
}

MensaShitParser.prototype = {
	constructor : MensaShitParser,
	
	download : function(){
		console.log("Downloading: ".grey + "%s".yellow, this.url)
		request(this.url, this.onAfterDownload.bind(this));
	},

	onAfterDownload : function(err, response, body){
		if( err ) return this.callback(err);
		if( response.statusCode !== 200 ) return this.callback("Failed with: " + response.statusCode);

		body = this.prepareBefore( body );
		this.parse( body );
	},

	parse : function( body ){
		var currentTagName = null,
			currentMenuName = null,
			currentMenu = null,

			inItem = false,
			
			currentDay = {
				date :null,
				menus : []
			},

			parsed = {
				name : null,
				days : [],
			};
		
		this.parser.ontext = function( text ){

			if( !parsed.name && currentTagName == TITLE ){
				parsed.name = text.replace("Speiseplan ", "");
			} else if( currentDay && !currentDay.date && currentTagName === TITLE ){
				currentDay.date = text;

			//new day
			} else if(currentTagName === ITEM){
				inItem = true;
			//new menu
			} else if(currentTagName === U){
				// we dont add kennzeichung
				if(currentMenuName && currentMenuName != "Kennzeichnung" && currentMenu){
					currentDay.menus.push({
						name : currentMenuName,
						menu : currentMenu.trim()
					});
				}
				
				currentMenuName = text;
				currentMenu = "";
			} else if(inItem) {
				/*
				 * replace all ( ) and remove whitespace at the
				 * end and at the start
				*/
				text = text.replace(/\(.+\)/g, '').trim();

				if(currentTagName === B){
					// we mark the the main menu element with *
					currentMenu += ' *' + text + '* ';
				} else {
					currentMenu += text;
				}
			}
		};

		this.parser.onclosetag = function( closingTag ){
			currentTagName = null;
			
			if( closingTag === ITEM ){
				if(currentDay){
					parsed.days.push(currentDay);
				}

				currentDay = {
					date : null,
					menus : []
				};

				inItem = false;
			}
		};

		this.parser.onopentag = function( node ){
			currentTagName = node.name;
		};

		this.parser.onend = function(){
			this.data = this.prepareAfter(parsed);
			this.done();
		}.bind(this);

		this.parser.write( body ).close();
	},

	done : function(){
		console.log("Parsing: ".grey + "Done".yellow);
		this.callback(null, this.data);
	},

	prepareBefore : function( data ){
		return data
			//replace CData tags
			.replace(/(\<\!\[CDATA\[|\]\]\>)/g, "")
			//replace tabs line breaks and returns
			.replace(/\t|\n|\r|/g, "")
			//replace br tags
			.replace(/(\<br\>|\<\/br\>)+/g, ' ')
			//replace empty <u> tags
			.replace(/\<u\><\/u\>/g, "")
			//replace multiple white space
			.replace(/\s{2,}/g, ' ')
	},

	prepareAfter : function( data ){
		data.days.forEach(function( day ){
			day.date = day.date.replace(/.+\, /, '');
		});

		return data;
	}
}


module.exports = MensaShitParser;