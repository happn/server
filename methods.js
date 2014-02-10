var _ = require("underscore"),
	db = app.db,
	async = require('async'),
	getIds = function( mid ){
		var ids = mid.split('-');
		return {
			mid : mid,
			doc : ids[0] + "-" + ids[1],
			index : ids[2]
		};
	};

module.exports = {

	/*  API-V2  */

	// [GET] v2/week/mensa_id/date
	week : function(request){
		var date = request.params.date,
			mensa_id = request.params.mensa_id,
			weekDays = app.utils.getWeekDays(date),
			self = this;

		async.each(weekDays, function(weekDay, done){
			db.get(weekDay + '-' + mensa_id, function(err, doc){
				if(!err && doc){
					delete doc._id;
					delete doc._rev;
					request.write(doc);	
				}
				done();
			});
		}, function(){
			request.end();
		});
	},

	// [POST] v2/like/mid/
	like : function( request ){
		var ids = getIds(request.params.mid),
			uuid = request.body.uuid;
		
		db.get(ids.doc, function(err, doc){
			var menu = _.findWhere(doc.menus, { mid : ids.mid });

			if( menu.likes.indexOf(uuid) == -1 ){
				menu.likes.push(uuid);
			}

			db.save(ids.doc, doc);
		});

		request.end();
	},

	// [POST] v2/unlike/mid/
	unlike : function( request ){
		var ids = getIds(request.params.mid),
			uuid = request.body.uuid;
		
		db.get(ids.doc, function(err, doc){
			var menu = _.findWhere(doc.menus, { mid : ids.mid });
			var index = menu.likes.indexOf( uuid );

			if ( index != -1 ) {
				menu.likes.splice( index, 1 );
			}

			db.save(ids.doc, doc);
		});

		request.end();
	},

	// [POST] v2/post/mid
	post : function( request ){
		var ids = getIds(request.params.mid),
			heythere_post_id = request.body.heythere_post_id;

		db.get(ids.doc, function(err, doc){
			var menu = _.findWhere(doc.menus, { mid : ids.mid });
			menu.pictures.push(heythere_post_id);
			db.save(ids.doc, doc);
		});

		request.end();
	}
};