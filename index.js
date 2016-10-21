var _ = require('underscore');
var DbAuth = require('./lib/db_auth');
var settingsInit = require('./settings');
var response = require('./lib/response');
var RouteHelper = require('./lib/routeHelper');
var validation = require('./lib/validation');

/*******************************************************************************

                    SETUP

*******************************************************************************/

module.exports = function(parentApp, settings){
    var self = this;

    var templates = new(require('./templates'))(settings);

    var express = require('express');
    var app = express();
    app.use('/', express.static(__dirname + '/public'));

    this.passwordMinLength = 8;
    settingsInit(this, settings);
    this.sessionTableName  = this.tableName + '_sessions';

    if( this.manageSessions ){
        if( !this.sessionSecret ){
            throw(new Error('sq_user_auth requires a sessionSecret'));
        }
        var session = require('express-session');
        if( this.knex ){            
            var KnexSessionStore = require('connect-session-knex')(session);
            var store = new KnexSessionStore({
                knex: this.knex,
                tablename: this.sessionTableName
            });            
        } else {
            var RDBStore = require('express-session-rethinkdb')(session);
            // this.rethinkConnectionOptions.table = this.sessionTableName;
            var store = new RDBStore({connectOptions: this.rethinkConnectionOptions,
                                      table: this.sessionTableName});
        }

        parentApp.use(session({
            secret: this.sessionSecret,
            cookie: {
                maxAge: this.sessionExpiration
            },
            saveUninitialized: this.sessionSaveUninitialized,
            resave: this.sessionResave,
            store: store
        }));
    }

    if( this.knex ){
        this.dbAuth = new DbAuth({
            'knex': this.knex,
            'tableName': this.tableName
        }, function(err){ if( err ){ throw(err) } });
        this._finishSetup();
    } else {
        var r = require('rethinkdb');
        r.connect(this.rethinkConnectionOptions, function(err, conn) {
            if (err){ throw err };
            this.dbAuth = new DbAuth({
                rethinkConnection: conn,
                tableName: this.tableName,
                databaseName: this.databaseName,
                sessionTableName: this.sessionTableName,
                manageSessions: this.manageSessions
            }, function(err){ if( err ){ throw(err) } });
            self._finishSetup();
        });
    }

    this._finishSetup = function(){
        // expose direct access to controller
        app.dbAuth = this.dbAuth;
        self.routeHelper = new RouteHelper({dbAuth: self.dbAuth,
                                            loginSuccessRedirect: self.loginSuccessRedirect,
                                            templates: templates},
                                           settings);
    }

/*******************************************************************************

                    ROUTES

*******************************************************************************/

    app.get('/api', function(req, res){
        if( !this.isLoggedIn(req) ){
            return res.json(response.get({errorCode: 'userNotLoggedIn'}));
        } else {
            var data = {user: {id: req.session.user.id}};
            return res.json(response.get({data: data}));
        }
    });

    app.get('/login', function(req, res){
        return res.send(templates.get('login', {rootUrl: settings.rootUrl}));
    });

    app.post('/api/login', function(req, res){
        routeHelper.handleLogin(req, res, {isApiRequest: true});
    })

    app.post('/login', function(req, res){
        routeHelper.handleLogin(req, res, {isApiRequest: false});
    })

    app.all('/logout', function(req, res){
        req.session.destroy();
        res.redirect(settings.rootUrl + '/login');
    });

    app.all('/api/logout', function(req, res){
        req.session.destroy();
        res.json(response.get());
    });

    app.get('/register', function(req, res){
        var d = {rootUrl: settings.rootUrl,
                 requireTerms: settings.requireTerms,
                 termsLink: settings.termsLink};
        res.send(templates.get('register', d));
    });

    app.post('/register', function(req, res){
        routeHelper.handleRegister(req, res, {isApiRequest: false});
    });

    app.post('/api/register', function(req, res){
        routeHelper.handleRegister(req, res, {isApiRequest: true});
    });

    app.get('/password-reset', function(req, res){
        var d = {rootUrl: settings.rootUrl,
                 errorMessage: ''};
        return res.send(templates.get('reset', d));
    })

    app.post('/password-reset', function(req, res){
        if( !req.body.email ||
            !validation.emailIsValid(req.body.email) ){

            var d = {rootUrl: settings.rootUrl,
                     errorMessage: 'Email address is not valid'};
            return res.send(templates.get('reset', d));
        }
        this.dbAuth.getResetCode(req.body.email, function(err, resp){
            if( err ){
                console.log(err);
                var d = {rootUrl: settings.rootUrl,
                         errorMessage: 'An error occurred, please try again'};
                return res.send(templates.get('reset', d));
            }

            if( resp.status !== 'success' || !resp.resetCode ){
                var d = {rootUrl: settings.rootUrl,
                         errorMessage: resp.error};
                return res.send(templates.get('reset', d));
            }

            var resetUrl = settings.rootUrl + '/password-reset-claim/' + resp.user.id + '/' + resp.resetCode;
            var templateData = {
                resetUrl: resetUrl
            }
            var host = req.get('host');
            var body = templates.get('emailPasswordReset', templateData);

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
                    return res.send(templates.get('reset', d));
                }
                return res.send(templates.get('resetPassword'));
            });
        });
    });

    app.get('/password-reset-claim/:userId/:resetCode', function(req, res){
        var d = {rootUrl: settings.rootUrl,
                 userId: req.params.userId,
                 resetCode: req.params.resetCode};
        return res.send(templates.get('resetForm', d));
    });

    app.post('/password-reset-claim', function(req, res){
        if( !req.body ||
            !req.body.userId ||
            !req.body.resetCode ||
            !req.body.password ){

            var d = {rootUrl: settings.rootUrl,
                     errorMessage: 'Data is not valid'};
            return res.send(templates.get('reset', d));
        }
        this.dbAuth.resetPasswordWithCode(req.body.userId,
                                            req.body.resetCode,
                                            req.body.password,
                                            function(err, response){

            if( err ){
                var d = {rootUrl: settings.rootUrl,
                         errorMessage: 'An error occurred, please try again'};
                return res.send(templates.get('reset', d));
            }
            if( response.status !== 'success' ){
                var d = {rootUrl: settings.rootUrl,
                         errorMessage: response.message};
                return res.send(templates.get('reset', d));
            }
            var d = {message: 'You password has been updated!'};
            return res.send(templates.get('message', d));
        });
    });

    app.get('/confirm/:userId/:confirmCode', function(req, res){
        if( !this.isLoggedIn(req) ){
            var d = {rootUrl: settings.rootUrl, errorMessage: 'Please login before confirming'}
            return res.send(templates.get('login', d));
        }
        var userId = Number(req.params.userId);
        if( !userId || userId !== this.getUserId(req) ){
            var d = {rootUrl: settings.rootUrl, errorMessage: 'User ID is invalid'}
            return res.send(templates.get('login', d));
        }
        this.dbAuth.confirmUser(userId,
                                  req.params.confirmCode,
                                  function(err, resp){
            if( err ){
                console.log(err);
                return res.send(templates.get('message',
                                              {message: 'An error occured, please try again'}));
            }
            
            if( resp.status === 'success' ){
                return res.send(templates.get('message',
                                              {message: 'Thanks, your email address is now confirmed!'}));
            } else {
                return res.send(templates.get('message',
                                              {message: resp.message}));
            }
        })
    });

    app.get('/confirm-resend', function(req, res){
        if( !this.isLoggedIn(req) ){
            var d = {rootUrl: settings.rootUrl, errorMessage: 'Please login first'};
            return res.send(templates.get('login', d));
        }
        return res.send(templates.get('resendConfirmation', {rootUrl: settings.rootUrl}));
    });

    app.post('/confirm-resend', function(req, res){
        var userId = this.getUserId(req);
        if( !userId ){
            var d= {rootUrl: settings.rootUrl, errorMessage: 'Please login first'}
            return res.send(templates.get('login', d));
        }

        this.dbAuth.getUser(userId, function(err, user){
            if( err ){
                console.log(err);
                var d = {rootUrl: settings.rootUrl,
                         errorMessage: 'An error occurred, please try again'};
                return res.send(templates.get('resendConfirmation', d));
            }
            var confirmUrl = settings.rootUrl + '/confirm/' + userId + '/' + user.confirmation_token;
            var templateData = {
                confirmUrl: confirmUrl
            }

            var body = templates.get('emailConfirmation', templateData);
            var host = req.get('host');
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
                    return templates.get('resendConfirmation', d);
                }
                return templates.get('message',
                                     {message: 'Please check your email to confirm your account'});
            });
        });
    });

/*******************************************************************************

                    HELPER FUNCTIONS

*******************************************************************************/

    this.isLoggedIn = function(req){
        return( req && req.session && req.session.user && req.session.user.id );
    }

    this.getUserId = function(req){
        if( req && req.session && req.session.user && req.session.user.id ){
            return req.session.user.id;
        }
        return null;
    }

    return app;
}