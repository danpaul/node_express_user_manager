var response = require('./response');
var validation = require('./validation');

module.exports = function(appOptions, settings){

    var dbAuth = appOptions.dbAuth;
    var loginSuccessRedirect = appOptions.loginSuccessRedirect;
    var templates = appOptions.templates;

    this.handleLogin = function(req, res, options){
        var self = this;
        var email = req.body.email ? req.body.email : '';
        var password = req.body.password ? req.body.password : '';

        dbAuth.checkPassword({
            'email': email,
            'password': password
        }, function(err, responseIn){
            if( err ){
                console.log(err);
                if( options.isApiRequest ){
                    return res.json(response.get({errorCode: 'unknown'}));
                } else {
                    var d = {rootUrl: settings.rootUrl,
                             errorMessage: 'An unknown error occurred'};
                    return res.send(templates.get('login', d));
                }
            } else if( responseIn.status !== 'success' ){
                if( options.isApiRequest ){
                    return res.json(responseIn);
                } else {
                    var d = {rootUrl: settings.rootUrl,
                             errorMessage: responseIn.error}; 
                    return res.send(templates.get('login', d));
                }
            }
            var responseObject = response.get();
            self.loginUser(req, responseIn.user, responseObject);
            if( options.isApiRequest ){ return res.json(responseObject); }
            if(loginSuccessRedirect){
                return res.redirect(loginSuccessRedirect);
            } else {
                return res.json(responseObject);
            }
        })
    }

    this.handleRegister = function(req, res, options){
        var self = this;
        var email = req.body.email ? req.body.email : '';
        var username = req.body.username ? req.body.username : '';
        var password = req.body.password ? req.body.password : '';

        var responseObject = null;
        if( !validation.emailIsValid(email) ){
            responseObject = response.get({errorCode: 'invalidEmail'});
        } else if( !validation.passwordIsValid(password) ){
            responseObject = response.get({errorCode: 'invalidPassword'});
        } else if( !validation.usernameIsValid(username) ){
            responseObject = response.get({errorCode: 'invalidUsername'});
        }
        if( responseObject ){
            if( options.isApiRequest ){ return res.json(responseObject); }
            var d = {rootUrl: settings.rootUrl,
                     errorMessage: responseObject.error,
                     requireTerms: settings.requireTerms,
                     termsLink: settings.termsLink}
            return res.send(templates.get('register', d));
        }
        dbAuth.create({
                            'email': email,
                            'password': password,
                            'username': username
                        },
                        function(err, resp){
            if( err ){
                console.log(err);
                resp = response.get({errorCode: 'unknown'});
            }
            if( options.isApiRequest ){ return res.json(resp); }
            if( resp.status !== 'success' ){
                var d = {rootUrl: settings.rootUrl,
                         errorMessage: resp.error,
                         requireTerms: settings.requireTerms,
                         termsLink: settings.termsLink}
                return res.send(templates.get('register', d));
            }
            var responseObject = response.get();
            self.loginUser(req, resp.user, responseObject);
            if( loginSuccessRedirect ){
                return res.redirect(loginSuccessRedirect);
            } else {
                return res.json(responseObject);
            }
        });
    }

    this.loginUser = function(req, user, responseObject){
        var session = req.session;
        session.user = {};
        session.user.id = user.id;
        session.user.isConfirmed = user.isConfirmed;
        if( responseObject ){
            if( !responseObject.data ){ responseObject.data = {}; }
            responseObject.data.user = {
                id: session.user.id,
                isConfirmed: session.user.isConfirmed
            }
        }
    }
}