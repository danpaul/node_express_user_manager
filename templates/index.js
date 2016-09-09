var _ = require('underscore');
var fs = require('fs');

const TEMPLATES = ['login', 'register'];
var templates = {};

TEMPLATES.forEach(function(t){
	var file = fs.readFileSync(__dirname + '/' + t + '.html').toString();
	templates[t] = _.template(file);
})

module.exports = templates;