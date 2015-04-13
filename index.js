/*******************************************************************************

                    SETUP

*******************************************************************************/

var _ = require('underscore')
// var jsmo = require('jsmo')

// var SqlLogin = require('sql_login')

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
    headerView: function(){},
    footerView: function(){}
}

/*******************************************************************************

                    MODULE

*******************************************************************************/

module.exports = function(settings){

    var self = this
    var app = require('express')()

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


    // see sql_comment docs for settings
    // self.sqlComment = new SqlComment(settings, function(err){
    //     if( err ){ throw(err) }
    // })


/*******************************************************************************

                    ROUTES

*******************************************************************************/

    app.get('/', function(req, res){
        res.send(require('./views/sign_in_form'))
    })

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

    return app
}