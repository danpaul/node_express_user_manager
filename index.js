/*******************************************************************************

                    SETUP

*******************************************************************************/

var STATUS_SUCCESS = 'success',
    STATUS_ERROR = 'error',
    STATUS_FAILURE = 'failure',
    ERROR_MESSAGE_SYSTEM = 'A system error occurred. Please try again.',
    FAILURE_MESSAGE_EMAIL = 'The email is not valid.',
    FAILURE_MESSAGE_LOGIN = 'Username or email is not correct.',
    FAILURE_MESSAGE_NOT_LOGGED_IN = 'User is not logged in.',
    FAILURE_MESSAGE_PASSWORD = 'The password is not valid.';
    FAILURE_MESSAGE_USERNAME = 'The username can only contain letters, numbers, underscores, dots and dashes';


var _ = require('underscore'),
    debug = require('debug')('sql_login_middleware'),
    SqlLogin = require('./lib/sql_login'),
    templates = require('./templates');

var handleDbResponse = function(err, errorMessage, res){

    var responseObject = getReponseObject()

    if( err ){
        responseObject.success = false
        responseObject.errorMessage = errorMessage
        res.json(responseObject)
    } else {
        res.json(responseObject)
    }
}

const DEFAULTS = {
    tableName: 'sql_user_auth',
    knex: null,
    usernameMinLength: 2,
    requireTerms: false,
    termsLink: '',
    registerSuccesRedirect: ''
}

// message used for error message
var getReponseObject = function(){
    return {
        status: STATUS_SUCCESS,
        message: '',
        data: {}
    }
}

/*******************************************************************************

                    SETUP

*******************************************************************************/

module.exports = function(settings){

    var self = this;
    var app = require('express')();

    self.passwordMinLength = 8;
    self.useUsername = settings.useUsername ? true : false;

    debug('Using username: ', self.useUsername);

    if( typeof(settings) === 'undefined' ){
        settings = {}
    }

    _.each(DEFAULTS, function(v, k){
        if( typeof(settings[k]) !== 'undefined' ){
            self[k] = settings[k]
        } else {
            self[k] = DEFAULTS[k]
        }
    })

    if( self.knex === null ){
        throw(new Error('sq_user_auth requires a knex object'));
    }

    self.sqlLogin = new SqlLogin({
        'knex': self.knex,
        'tableName': self.tableName,
        'useUsername': self.useUsername
    }, function(err){
        if( err ){ throw(err) }
    })

    // expose direct access
    app.sqlLogin = self.sqlLogin;

/*******************************************************************************

                    DIRECT ACCESS METHODS

*******************************************************************************/

    /**
     * Gets user by id. Passes back null if user not found
     * @param  {int}  options.userId
     */
//     self.getUser = function(options, callback){
// console.log('asdf 10')
//         var id = parseInt(options.userId);
//         if( !id ){ return callback(new Error('Invalid id')); }
// console.log('asdf 11')
//         sqlLogin.getUser(callback);
//     }

/*******************************************************************************

                    ROUTE FUNCTIONS

*******************************************************************************/

    var handleLogin = function(req, res, options){
        var email = req.body.email ? req.body.email : '',
            password = req.body.password ? req.body.password : '',
            responseObject = getReponseObject();

        self.sqlLogin.checkPassword({
            'email': email,
            'password': password
        }, function(err, response){
            if( err ){
                responseObject.status = STATUS_ERROR
                responseObject.message = ERROR_MESSAGE_SYSTEM
            } else if( response.status !== STATUS_SUCCESS ){
                responseObject.status = STATUS_FAILURE
                responseObject.message = FAILURE_MESSAGE_LOGIN
            } else {
                loginUser(req, response, responseObject);
            }
            if( options.isApiRequest ){
                res.json(responseObject);
            } else {
                if( responseObject.status !== STATUS_SUCCESS ){
                    var d = {rootUrl: settings.rootUrl,
                             errorMessage: responseObject.message};
                    res.send(templates.login(d));
                } else {
                    // TODO: handle success
                    res.json(responseObject);
                }
            }            
        })
    }

    var handleRegister = function(req, res, options){
        var email = req.body.email ? req.body.email : '';
        var username = req.body.username ? req.body.username : '';
        var password = req.body.password ? req.body.password : '';
        var responseObject = getReponseObject();
        debug('Registering user ', email);

        if( !self.emailIsValid(email) ){
            responseObject.status = STATUS_FAILURE;
            responseObject.message = FAILURE_MESSAGE_EMAIL;
        }
        if( !self.passwordIsValid(password) ){
            responseObject.status = STATUS_FAILURE;
            responseObject.message = FAILURE_MESSAGE_PASSWORD;
        }
        if( !self.usernameIsValid(username) ){
            responseObject.status = STATUS_FAILURE;
            responseObject.message = FAILURE_MESSAGE_USERNAME;
        }
        if( responseObject.status !== STATUS_SUCCESS ){
            if( options.isApiRequest ){ return res.json(responseObject); }
            var d = {rootUrl: settings.rootUrl,
                     errorMessage: responseObject.message,
                     requireTerms: settings.requireTerms,
                     termsLink: settings.termsLink}
            return res.send(templates.register(d));
        }
        debug('Creating user ', email);
        sqlLogin.create({
                            'email': email,
                            'password': password,
                            'username': username
                        },
                        function(err, response){
            if( err ){
                debug(err);
                responseObject.status = STATUS_ERROR;
                responseObject.message = ERROR_MESSAGE_SYSTEM;
            }
            if( options.isApiRequest ){ return res.json(response); }
            if( response.status !== STATUS_SUCCESS ){
                var d = {rootUrl: settings.rootUrl,
                         errorMessage: response.message,
                         requireTerms: settings.requireTerms,
                         termsLink: settings.termsLink}
                return res.send(templates.register(d));
            }
            loginUser(req, response, responseObject);
            // TODO: handle register success/redirect
            return res.json(responseObject);
        });
    }

    var loginUser = function(req, options, responseObject){
        var session = req.session;
        session.user = {};
        session.user.id = options.userId;
        session.user.isConfirmed = options.isConfirmed;
        if( responseObject ){
            responseObject.data.user = {
                id: session.user.id,
                isConfirmed: session.user.isConfirmed
            }
        }
    }

/*******************************************************************************

                    ROUTES

*******************************************************************************/

    app.get('/login', function(req, res){
        res.send(templates.login({rootUrl: settings.rootUrl}));
    });

    app.get('/register', function(req, res){
        var d = {rootUrl: settings.rootUrl,
                 requireTerms: settings.requireTerms,
                 termsLink: settings.termsLink};
        res.send(templates.register(d));
    });

    app.post('/login', function(req, res){
        handleLogin(req, res, {isApiRequest: false});
    })

    app.post('/api/login', function(req, res){
        handleLogin(req, res, {isApiRequest: true});
    })

    app.all('/logout', function(req, res){
        req.session.destroy();
        res.json(getReponseObject());
        // TODO, redirect to login form if not api
    });

    app.post('/register', function(req, res){
        handleRegister(req, res, {isApiRequest: false});
    })

    app.post('/api/register', function(req, res){
        handleRegister(req, res, {isApiRequest: true});
    })

    app.get('/', function(req, res){
        var responseObject = getReponseObject();
        if( !req.session || !req.session.user || !req.session.user.id ){
            responseObject.status = STATUS_FAILURE;
            responseObject.message = FAILURE_MESSAGE_NOT_LOGGED_IN;
        } else {
            responseObject.data.id = req.session.user.id;
            responseObject.data.isConfirmed = req.session.user.isConfirmed;
        }
        res.json(responseObject);
    });

/*******************************************************************************

                    HELPER FUNCTIONS

*******************************************************************************/
    // http://stackoverflow.com/questions/46155/validate-email-address-in-javascript
    self.emailIsValid = function(email){
        var re = /^([\w-]+(?:\.[\w-]+)*)@((?:[\w-]+\.)*\w[\w-]{0,66})\.([a-z]{2,6}(?:\.[a-z]{2})?)$/i;
        return re.test(email);
    }

    self.passwordIsValid = function(password){
        if( !password ){ return false; }
        if( password.length < self.passwordMinLength ){ return false; }
        return true;
    }

    self.usernameIsValid = function(username){
        debug('Validating username ', username);
        if( username.length < self.usernameMinLength ){
            return false;
        }
        return(/^([a-zA-Z0-9]|\-|\_|\.)+$/.test(username));
    }

    return app;
}