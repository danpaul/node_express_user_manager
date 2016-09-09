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

var defaults = {
    tableName: 'sql_login',
    knex: null,
    usernameMinLength: 2
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

                    MODULE

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

    _.each(defaults, function(v, k){
        if( typeof(settings[k]) !== 'undefined' ){
            self[k] = settings[k]
        } else {
            self[k] = defaults[k]
        }
    })

    if( self.knex === null ){
        throw(new Error('sql_login_middleware requires a knex object'))
    }

    self.sqlLogin = new SqlLogin({
        'knex': self.knex,
        'tableName': self.tableName,
        'useUsername': self.useUsername
    }, function(err){
        if( err ){ throw(err) }
    })

/*******************************************************************************

                    ROUTES

*******************************************************************************/

    app.get('/is-logged-in', function(req, res){
        var sess = req.session;
        if( sess && sess.isLoggedIn ){
            res.json(true);
        } else {
            res.json(false);
        }
    })

    app.get('/login', function(req, res){
        res.send(templates.login({rootUrl: settings.rootUrl}));
    });

    app.get('/register', function(req, res){
        res.send(templates.register({rootUrl: settings.rootUrl}));
    });

    app.post('/login', function(req, res){

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

                var session = req.session;
                session.userId = response.userId;
                session.isConfirmed = response.isConfirmed;
                session.isLoggedIn = true;

                responseObject.data.id = response.userId;
                responseObject.data.isConfirmed = response.isConfirmed;
            }
            res.json(responseObject)
        })
    })

    app.all('/logout', function(req, res){
        req.session.destroy();
        res.json(getReponseObject());
    });

    // app.post('/logout', function(req, res){
    //     req.session.destroy();
    //     res.json(getReponseObject());
    // });

    app.post('/register', function(req, res){
        var email = req.body.email ? req.body.email : '';
        var username = req.body.username ? req.body.username : '';
        var password = req.body.password ? req.body.password : '';
        var responseObject = getReponseObject();

console.log('email', email)
console.log('username', username)
console.log('password', password)

        debug('Registering user ', email);

        if( !self.emailIsValid(email) ){
            responseObject.status = STATUS_FAILURE;
            responseObject.message = FAILURE_MESSAGE_EMAIL;
            res.json(responseObject);
            return;
        }

        if( !self.passwordIsValid(password) ){
            responseObject.status = STATUS_FAILURE;
            responseObject.message = FAILURE_MESSAGE_PASSWORD;
            res.json(responseObject);
            return;
        }

        if( !self.usernameIsValid(username) ){
            responseObject.status = STATUS_FAILURE;
            responseObject.message = FAILURE_MESSAGE_USERNAME;
            res.json(responseObject);
            return;
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
            res.json(response);
        });
    })

    app.post('/api/register', function(req, res){
        var email = req.body.email ? req.body.email : '';
        var username = req.body.username ? req.body.username : '';
        var password = req.body.password ? req.body.password : '';
        var responseObject = getReponseObject();

        debug('Registering user ', email);

        if( !self.emailIsValid(email) ){
            responseObject.status = STATUS_FAILURE;
            responseObject.message = FAILURE_MESSAGE_EMAIL;
            res.json(responseObject);
            return;
        }

        if( !self.passwordIsValid(password) ){
            responseObject.status = STATUS_FAILURE;
            responseObject.message = FAILURE_MESSAGE_PASSWORD;
            res.json(responseObject);
            return;
        }

        if( !self.usernameIsValid(username) ){
            responseObject.status = STATUS_FAILURE;
            responseObject.message = FAILURE_MESSAGE_USERNAME;
            res.json(responseObject);
            return;
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
            res.json(response);
        });
    })

    app.get('/', function(req, res){
        var responseObject = getReponseObject();
        if( !req.session || !req.session.isLoggedIn ){
            responseObject.status = STATUS_FAILURE;
            responseObject.message = FAILURE_MESSAGE_NOT_LOGGED_IN;
        } else {
            responseObject.data.id = req.session.userId;
            responseObject.data.isConfirmed = req.session.isConfirmed;
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