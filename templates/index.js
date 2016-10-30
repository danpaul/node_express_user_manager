var _ = require('underscore');
var fs = require('fs');

const TEMPLATES = ['login',
				   'profile',
				   'register',
				   'reset',
				   'resetPassword',
				   'resendConfirmation',
				   'emailConfirmation',
				   'emailPasswordReset',
				   'resetForm',
				   'message'];

var headerFile = fs.readFileSync(__dirname + '/_header.html').toString();
var headerTemplate = _.template(headerFile);

/**
 * @param  {string}  options.rootUrl  required, root url of the middleware
 * @param  {string}  options.header  optional, gets injected at end of header
 * @param  {string}  options.bodyTop  optional, gets injected at top of body
 * @param  {string}  options.bodyBottom  optional, get inected at bottom of body
 */
module.exports = function(options){
	var templates = this.templates = {};
	TEMPLATES.forEach(function(t){
		var file = fs.readFileSync(__dirname + '/' + t + '.html').toString();
		templates[t] = _.template(file);
	});

	var headerString = headerTemplate({rootUrl: options.rootUrl});
	var userHeader = options.header ? options.header : '';
	var bodyTop = options.bodyTop ? options.bodyTop : '';
	var bodyBottom = options.bodyBottom ? options.bodyBottom : '';

	this.get = function(templateName, data){
		if( !data ){ data = {}; }
		if( !this.templates[templateName] ){
			console.log(new Error('Unknown tempate: ' + templateName));
			return '';
		}
		data.header = headerString;
		data.bodyTop = bodyTop;
		data.bodyBottom = bodyBottom;
		data.userHeader = userHeader;
		return (this.templates[templateName])(data);
	}
};