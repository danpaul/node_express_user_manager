/*******************************************************************************

                    SETUP

*******************************************************************************/

var STATUS_SUCCESS = 'success';
var STATUS_ERROR = 'error';
var STATUS_FAILURE = 'failure';
var ERROR_MESSAGE_SYSTEM = 'A system error occurred. Please try again.';
var FAILURE_MESSAGE_EMAIL = 'The email is not valid.';
var FAILURE_MESSAGE_LOGIN = 'Username or email is not correct.';
var FAILURE_MESSAGE_NOT_LOGGED_IN = 'User is not logged in.';
var FAILURE_MESSAGE_PASSWORD = 'The password is not valid.';
var FAILURE_MESSAGE_USERNAME = 'The username can only contain letters, numbers, underscores, dots and dashes';
var FAILURE_MESSAGE_MISSING_PARAMS = 'Required data is missing';


var _ = require('underscore');
var debug = require('debug')('sql_login_middleware');
var SqlLogin = require('./lib/sql_login');
var templates = require('./templates');

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

var isLoggedIn = function(req){
    return( req && req.session && req.session.user && req.session.user.id );
}

var getUserId = function(req){
    if( req && req.session && req.session.user && req.session.user.id ){
        return req.session.user.id;
    }
    return null;
}

const DEFAULTS = {
    tableName: 'sql_user_auth',
    knex: null,
    usernameMinLength: 2,
    requireTerms: false,
    termsLink: '',
    registerSuccesRedirect: '',
    transporter: null,
    siteName: null
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

    if( !self.transporter ){
        throw(new Error('sq_user_auth requires a Nodemailer transporter'));
    }

    if( !self.siteName ){
        throw(new Error('sq_user_auth requires a siteName'));
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
    });

    app.post('/api/register', function(req, res){
        handleRegister(req, res, {isApiRequest: true});
    });

    // untested, should be get so can email
    app.post('/api/confirm-password', function(req, res){
        var responseObject = getReponseObject();
        if( !isLoggedIn(req) ){
            responseObject.status = STATUS_FAILURE;
            responseObject.message = FAILURE_MESSAGE_NOT_LOGGED_IN;
            return res.json(responseObject);
        }

        if( !req.body ||
            !req.body.email ||
            !_.isString(req.body.email) ||
            !req.body.token ||
            !_.isString(req.body.token) ){

            responseObject.status = STATUS_FAILURE;
            responseObject.errorMessage = FAILURE_MESSAGE_MISSING_PARAMS;
            return res.json(responseObject);
        }

        this.sqlLogin.confirmUser(req.body.email,
                                  req.body.token,
                                  function(err, resp){
            if( err ){
                console.log(err);
                responseObject.status = STATUS_ERROR;
                responseObject.errorMessage = ERROR_MESSAGE_SYSTEM;
                return res.json(responseObject);
            }
            return res.json(resp);
        });
    });

    app.get('/', function(req, res){
        var responseObject = getReponseObject();
        if( !isLoggedIn(req) ){
            responseObject.status = STATUS_FAILURE;
            responseObject.message = FAILURE_MESSAGE_NOT_LOGGED_IN;
        } else {
            responseObject.data.id = req.session.user.id;
            responseObject.data.isConfirmed = req.session.user.isConfirmed;
        }
        res.json(responseObject);
    });

    app.get('/password-reset', function(req, res){
        var d = {rootUrl: settings.rootUrl,
                 errorMessage: ''};
        res.send(templates.reset(d));
    })

    app.post('/password-reset', function(req, res){
        if( !req.body.email ||
            !this.emailIsValid(req.body.email) ){

            var d = {rootUrl: settings.rootUrl,
                     errorMessage: 'Email address is not valid'};
            return res.send(templates.reset(d));
        }
        this.sqlLogin.getResetCode(req.body.email, function(err, resp){
            if( err ){
                console.log(err);
                var d = {rootUrl: settings.rootUrl,
                         errorMessage: 'An error occurred, please try again'};
                return res.send(templates.reset(d));
            }

            if( resp.status !== 'success' || !resp.resetCode ){
                return res.send(templates.resetPassword());
            }

            var resetUrl = settings.rootUrl + '/password-reset-claim/' + resp.user.id + '/' + resp.resetCode;
            var templateData = {
                resetUrl: resetUrl
            }
            var host = req.get('host');
            var body = templates.emailPasswordReset(templateData);
            var emailData = {
                from: ('noreply@' + host) ,
                to: resp.user.email,
                subject: (settings.siteName + ': Password Reset'),
                html: body
            }

            transporter.sendMail(emailData, function(err, info){
                if(err){
                    console.log(error);
                    var d = {rootUrl: settings.rootUrl,
                             errorMessage: 'An error occurred, please try again'};
                    return res.send(templates.reset(d));
                }
                return res.send(templates.resetPassword());
            });
        });
    });

    app.get('/password-reset-claim/:userId/:resetCode', function(req, res){
        var d = {rootUrl: settings.rootUrl,
                 userId: req.params.userId,
                 resetCode: req.params.resetCode};
        return res.send(templates.resetForm(d));
    });

    app.post('/password-reset-claim', function(req, res){
        if( !req.body ||
            !req.body.userId ||
            !req.body.resetCode ||
            !req.body.password ){

            var d = {rootUrl: settings.rootUrl,
                     errorMessage: 'Data is not valid'};
            return res.send(templates.reset(d));
        }
        this.sqlLogin.resetPasswordWithCode(req.body.userId,
                                            req.body.resetCode,
                                            req.body.password,
                                            function(err, response){

            if( err ){
                var d = {rootUrl: settings.rootUrl,
                         errorMessage: 'An error occurred, please try again'};
                return res.send(templates.reset(d));
            }
            if( response.status !== 'success' ){
                var d = {rootUrl: settings.rootUrl,
                         errorMessage: response.message};
                return res.send(templates.reset(d));
            }
            var d = {message: 'You password has been updated!'};
            return res.send(templates.message(d));
        });
    });

    app.get('/confirm/:userId/:confirmCode', function(req, res){
        if( !isLoggedIn(req) ){
            return res.send(templates.login({rootUrl: settings.rootUrl,
                                             errorMessage: 'Please login before confirming'}));
        }
        var userId = Number(req.params.userId);
        if( !userId || userId !== getUserId(req) ){
            return res.send(templates.login({rootUrl: settings.rootUrl,
                                             errorMessage: 'User ID is invalid'}));
        }
        this.sqlLogin.confirmUser(userId,
                                  req.params.confirmCode,
                                  function(err, resp){
            if( err ){
                // Todo
                console.log(err);
                return res.send(templates.message({message: 'An error occured, please try again'}));
                return;
            }
            
            if( resp.status === 'success' ){
                var message = 'Thanks, your email address is now confirmed!';
                return res.send(templates.message({message: message}));
            } else {
                return res.send(templates.message({message: resp.message}));
            }
            
        })
    });

    app.get('/confirm-resend', function(req, res){
        if( !isLoggedIn(req) ){
            return res.send(templates.login({rootUrl: settings.rootUrl,
                                             errorMessage: 'Please login first'}));
        }
        return res.send(templates.resendConfirmation({rootUrl: settings.rootUrl}));
    });

    app.post('/confirm-resend', function(req, res){
        var userId = getUserId(req);
        if( !userId ){
            return res.send(templates.login({rootUrl: settings.rootUrl,
                                             errorMessage: 'Please login first'}));
        }

        this.sqlLogin.getUser(userId, function(err, user){
            if( err ){
                console.log(err);
                var message = 'An error occurred, please try again';
                return res.send(templates.resendConfirmation({rootUrl: settings.rootUrl, errorMessage: message}));
            }
            var confirmUrl = settings.rootUrl + '/confirm/' + userId + '/' + user.confirmation_token;
            var templateData = {
                confirmUrl: confirmUrl
            }
            var host = req.get('host');
            var body = templates.emailConfirmation(templateData);
            var emailData = {
                from: ('noreply@' + host) ,
                to: user.email,
                subject: (settings.siteName + ': Please Confirm'),
                html: body
            }
            // send email
            transporter.sendMail(emailData, function(err, info){
                if(err){
                    console.log(error);
                    var d = {rootUrl: settings.rootUrl,
                             errorMessage: 'An error occurred, please try again'};
                    return res.send(templates.resendConfirmation(d));
                }
                return res.send(templates.message({message: 'Please check your email to confirm your account'}));
            });
        });
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