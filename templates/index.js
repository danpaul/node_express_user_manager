var _ = require('underscore');
var fs = require('fs');

const TEMPLATES = ['login',
				   'register',
				   'reset',
				   'resetPassword',
				   'resendConfirmation',
				   'emailConfirmation',
				   'emailPasswordReset',
				   'resetForm',
				   'message'];

module.exports = function(options){
	var templates = this.templates = {};
	TEMPLATES.forEach(function(t){
		var file = fs.readFileSync(__dirname + '/' + t + '.html').toString();
		templates[t] = _.template(file);
	});
	this.get = function(templateName, data){
		if( !this.templates[templateName] ){
			console.log(new Error('Unknown tempate: ' + templateName));
			return '';
		}
		return (this.templates[templateName])(data);
	}
};