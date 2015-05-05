/*******************************************************************************

                    SETUP

*******************************************************************************/

var STATUS_SUCCESS = 'success',
    STATUS_ERROR = 'error',
    STATUS_FAILURE = 'failure',
    ERROR_MESSAGE_SYSTEM = 'A system error occurred. Please try again.',
    FAILURE_MESSAGE_EMAIL = 'The email is not valid.',
    FAILURE_MESSAGE_LOGIN = 'Username or email is not correct.',
    FAILURE_MESSAGE_PASSWORD = 'The password is not valid.';


var _ = require('underscore'),
        SqlLogin = require('sql_login')

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
    headerView: function(){ return '' },
    footerView: function(){ return '' },
    rootUrl: '/',
    tableName: 'sql_login',
    knex: null
}

// message used for error message
var getReponseObject = function(){
    return {
        status: STATUS_SUCCESS,
        message: ''
    }
}

/*******************************************************************************

                    MODULE

*******************************************************************************/

module.exports = function(settings){

    var self = this;
    var app = require('express')();

    self.passwordMinLength = 8;

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
        'tableName': self.tableName
    }, function(err){
        if( err ){ throw(err) }
    })

/*******************************************************************************

                    ROUTES

*******************************************************************************/

    app.get('/login', function(req, res){
        var body = require('./views/login_form')({rootUrl: self.rootUrl})
        res.send(self.getHtml(body))
    })

    app.post('/login', function(req, res){
        var email = req.body.email ? req.body.email : '',
            password = req.body.password ? req.body.password : '',
            responseObject = getReponseObject()

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
            }
            res.json(responseObject)
        })
    })

    app.get('/register', function(req, res){
        var body = require('./views/register_form')({rootUrl: self.rootUrl})
        res.send(self.getHtml(body))
    })

    app.post('/register', function(req, res){
        var email = req.body.email ? req.body.email : '';
        var password = req.body.password ? req.body.password : '';
        var responseObject = getReponseObject();

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

        sqlLogin.create({'email': email, 'password': password},
                        function(err, response){
            if( err ){
                responseObject.status = STATUS_ERROR;
                responseObject.message = ERROR_MESSAGE_SYSTEM;
            }
            res.json(response);
        });
    })

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

    self.getHtml = function(body){
        return self.headerView() + body + self.footerView()
    }

    // app.get('/test', function(req, res){
    //     res.send('this is only a test')
    // })

    // app.delete('/comment/:commentId', function(req, res){
    //     sqlComment.delete(req.params.commentId, function(req, res){
    //         handleDbResponse(err, res, ERROR_DELETEING_RECORD)
    //     })
    // })

    // // passes back only non-deleted comments for post
    // app.get('/comments/:postId', function(req, res){
    //     sqlComment.getComments(req.params.postId, false, function(err){
    //         handleDbResponse(err, ERROR_RETRIEVING_RECORDS, res)
    //     })
    // })

    // // passes back all comments for post
    // app.get('/comments-all/:postId', function(req, res){
    //     sqlComment.getComments(req.params.postId, true, function(err){
    //         handleDbResponse(err, ERROR_RETRIEVING_RECORDS, res)
    //     })
    // })

    // // sqlComment.getFormattedComments(postId, true, function(err, comments){
    // // do not include deleted comments
    // app.get('/comments-formatted/:postId', function(req, res){
    //     sqlComment.getFormattedComments(req.params.postId,
    //                                     false,
    //                                     function(err, comments){

    //         handleDbResponse(err, ERROR_RETRIEVING_RECORDS, res)
    //     })
    // })

    // // include deleted comments
    // app.get('/comments-formatted/:postId', function(req, res){
    //     sqlComment.getFormattedComments(req.params.postId,
    //                                     true,
    //                                     function(err, comments){

    //         handleDbResponse(err, ERROR_RETRIEVING_RECORDS, res)
    //     })
    // })

    // // sqlComment.add(userId, postId, 0, 'This is a comment', callbackB)
    // // parentId should be 0 if comment is top level
    // app.post('/post/:postId/:parentId', function(req, res, next){
    //     self.sqlComment.add(req.body.userId,
    //                         req.params.postId,
    //                         req.params.parentId,
    //                         req.body.comment,
    //                         function(err){

    //         handleDbResponse(err, ERROR_SAVING_RECORD, res)
    //     })
    // })

    // app.post('/comment/vote/:direction/:commentId', function(req, res){
    //     if( req.params.direction === 'up' ){
    //         var vote = true
    //     } else {
    //         var vote = false
    //     }
    //     sqlComment.vote(req.body.userId,
    //                     req.params.commentId,
    //                     vote,
    //                     function(err){

    //         handleDbResponse(err, ERROR_CASTING_VOTE, res)
    //     })
    // })

    return app;
}