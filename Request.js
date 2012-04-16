var _ = require("underscore");


function Request(request, response, options){
	this.open = true;
	this.code = 200;
	this.request = request;
	this.response = response;
	this.responseData = [];
	this.query = request.query;
	this.params = request.params;
	this.options = _.extend({
		contentType : 'application/json',
		version : 1
	}, options);
}

Request.prototype.setHeaders = function(){
	this.response.setHeader("Content-Type", this.options.contentType);
};


Request.prototype.end = function(){
	this.response.end(JSON.stringify(this._wrap()));
	this.open = false;
};

Request.prototype.write = function(obj){
	if(this.open){
		this.responseData.push(obj)
	}
};

Request.prototype.exitWithError = function(err){
	this.error = err;
	this.end();
};

Request.prototype._wrap = function(){
	var head = {
			version : this.options.version
		}, 
		body = {};

	if(this.error){
		head.error = true;
		body.description = this.error;
	} else {
		head.success = true;
		body = this.responseData;
	}

	head.data = body;

	return head;
};



module.exports = Request;