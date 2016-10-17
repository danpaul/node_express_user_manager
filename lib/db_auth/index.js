var _ = require('underscore');
var async = require('async');
var bcrypt = require('bcrypt');
var base64url = require('base64url');
var crypto = require('crypto');
var debug = require('debug')('sql_login');

var errorCodes = {
    '1': 'A user with that email already exists.',
    '2': 'Unable to find user.',
    '3': 'Password is incorrect.',
    '4': 'New password can not be the same as the old password.',
    '5': 'Unable to verify confirmation token.',
    '6': 'Password reset token is not correct.',
    '7': 'Password reset token has expired.',
    '8': 'A user with that email or username already exists.'
};

const errors = {
    usernameClaimed: 'The username is already taken',
    emailClaimed: 'The username or email is already taken',
    noUser: 'Could not find user',
    invalidPassword: 'Password is not correct',
    newPasswordCanNotMatch: 'New password must be different than previous password',
    invalidToken: 'Token is invalid'
}

var getSchema = function(options){
    var useUsername = options &&
                      options.useUsername &&
                      options.useUsername === true;

    return function(table){
        table.increments();
        table.string('email').index().unique();
        if( useUsername ){
            table.string('username').index().unique();
        }
        table.string('password');
        table.boolean('is_confirmed').default(false);
        table.string('confirmation_token').default('');
        table.string('reset_token').default('');
        table.integer('reset_token_sent').default(0);
        table.string('login_attempts').default('[]');
    }
}

var getResponse = function(errorCode, callback){
    var responseObject = {status: 'success', error: null, errorCode: null};
    if( errorCode ){
        responseObject.status = 'error';
        responseObject.error = errors[errorCode];
        responseObject.errorCode = errorCode;
    }
    if( callback ){
        return callback(null, responseObject);
    } else {
        return responseObject;
    }
}

// Options include: knexObject, tableName, useUsername
module.exports = function(options, callbackConstructor){

    var self = this;
    this.knex = options.knex;
    this.tableName = options.tableName;
    this.useUsername = options.useUsername ? true : false;
    this.passwordResetExpiration = 60 * 60 * 24; // 24 hours

    if( options.knex  ){
        if( !options.tableName ){ throw new Error('Missing options'); }
        var SqlDriver = require('./drivers/sql');
        this.driver = new SqlDriver(options);
        this.driver.init(callbackConstructor);
    } else {
        throw new Error('Missing options');
    }

    /**
     * @param {string}  options.email
     * @param {string}  options.username
     * @param {string}  options.password
     */
    this.create = function(options, callback){
        var self = this;
        if( !options.email || !options.username || !options.password ){
            return callback(new Error('Missing options'));
        }
        this.driver.usernameClaimed(options, function(err, isClaimed){
            if( err ){ return callback(err); }
            if( isClaimed ){
                return getResponse('usernameClaimed', callback);
            }
            self.driver.emailClaimed(options, function(err, isClaimed){
                if( err ){ return callback(err); }
                if( isClaimed ){
                    return getResponse('emailClaimed', callback);
                }
                self.createUser(options, callback);
            });
        });
    }

    /**
     * @param {string}  options.email
     * @param {string}  options.username
     * @param {string}  options.password
     */
    this.createUser = function(options, callback){
        var self = this;
        bcrypt.hash(options.password, 8, function(err, hash) {
            if( err ){ return callback(err); }
            var args = {
                email: options.email,
                username: options.username,
                password: hash,
                confirmationToken: self.getRandomString()
            };
            self.driver.createUser(args, function(err, user){
                if( err ){ return callback(err); }
                var response = getResponse();
                response.user = user;
                return callback(null, response);
            });
        });
    }

    /**
     * @param {string}  options.email
     * @param {string}  options.password
     */
    this.checkPassword = function(options, callback){
        if( !options.email || !options.password ){
            return callback(new Error('Missing options'));
        }

        this.driver.getUser({email: options.email}, function(err, user){
            if( err ){ return callback(err); }
            if( !user ){ return getResponse('noUser', callback); }
            bcrypt.compare(options.password, user.password, function(err, res){
                if( err ){ return callback(err); }
                if( res !== true ){
                    return getResponse('invalidPassword', callback);
                }
                var response = getResponse();
                response.user = user;
                return callback(null, response);
            });
        });
    }

    /**
     * @param {string}  options.email either options.email or options.id is required
     * @param {string}  options.id
     */
    this.updatePassword = function(options, callback){
        var self = this;
        if( !(options.email || options.id) ){
           return callback(new Error('Missing options'));
        }
        this.driver.getUser(options, function(err, user){

            if( err ){ return callback(err); }
            if( !user ){ return getResponse('noUser', callback); }

            bcrypt.compare(options.password, user.password, function(err, res) {
                if( err ){ return callback(err); }
                if( res === true ){
                    return getResponse('newPasswordCanNotMatch', callback);
                }
                // get hash of new password
                bcrypt.hash(options.password, 8, function(err, hash) {
                    if( err ){ return callback(err); }
                    options.password = hash;
                    self.driver.updatePassword(options, function(err){
                        if( err ){ return callback(err); }
                        return getResponse(null, callback);
                    });
                });
            });
        })
    }

    /**
     * @param  {options.email}  either options.email or options id required
     * @param  {options.id}
     */
    this.getUser = function(options, callback){
        var self = this;
        if( !(options.email || options.id) ){
           return callback(new Error('Missing options'));
        }
        this.driver.getUser(options, function(err, user){
            if( err ){ return callback(err); }
            var response = getResponse();
            if( !user ){
                response.user = null;
            } else {
                response.user = user;
            }
            return callback(null, response);
        });
    }

    /**
     * @param  {options.email}  either options.email or options id required
     * @param  {options.id}
     * @param  {options.token}
     */
    this.confirmUser = function(options, callback){
        var self = this;
        if( !(options.email || options.id) || !options.token ){
           return callback(new Error('Missing options'));
        }
        this.driver.getUser(options, function(err, user){
            if( err ){ return callback(err); }
            if( !user ){ return getResponse('noUser', callback); }
            if( user.is_confirmed ){
                return getResponse(null, callback);
            }
            if( user.confirmation_token !== options.token ){
                return getResponse('invalidToken', callback);
            }
            self.driver.confirmUser({id: user.id}, function(err){
                if( err ){ return callback(err); }
                return getResponse(null, callback);
            });
        });
    }



// asdf 









    this.deleteUser = function(email, callbackIn){
        self.knex(self.tableName)
            .where({'email': email})
            .del()
            .then(function(){ callbackIn(); })
            .catch(callbackIn)
    }





// asdf
    this.getRandomString = function(){
        return base64url(crypto.randomBytes(48))
    }

    this.getCurrentTime = function(){
        return Math.floor(Date.now()/1000);
    }

    // sets up a new reset code for user
    this.getResetCode = function(identifier, callback){
        self.getUser(identifier, function(err, user){
            if( err ){
                callback(err);
                return;
            }
            if( user === null ){
                callback(null, self.getError(2))
                return;
            }
            // generate code
            var resetCode = self.getRandomString();
            // get encrypted password
            bcrypt.hash(resetCode, 8, function(err, hash) {
                if( err ){
                    callbackIn(err)
                    return;
                }
                self.knex(self.tableName)
                    .where('id', user.id)
                    .update({
                        reset_token: hash,
                        reset_token_sent: self.getCurrentTime()
                    })
                    .then(function(){
                        var response = self.getSuccess();
                        response.resetCode = resetCode;
                        response.user = user;
                        callback(null, response) 
                    })
                    .catch(callback)
            })
        })
    }

    this.getSuccess = function(){ return {status: 'success'} }

    // gets user from email or id, passes back null if user not found, else user object
    // this.getUser = function(identifier, callbackIn){

    //     if( isNaN(identifier) ){
    //         var whereClause = {'email': identifier};
    //     } else {
    //         var whereClause = {'id': identifier};
    //     }

    //     // lookup user
    //     self.knex(self.tableName)
    //         .where(whereClause)
    //         .then(function(userIn){
    //             if( userIn.length === 0 ){
    //                 callbackIn(null, null)
    //             } else {
    //                 callbackIn(null, userIn[0])
    //             }
    //         })
    //         .catch(callbackIn)
    // }

    this.passwordTokenHasExpired = function(resetTokenSent){
        var currentTime = self.getCurrentTime();
        return( (currentTime - self.passwordResetExpiration) < resetTokenSent )
    }

    this.resetPasswordWithCode = function(userId, resetCode, newPassword, callback){
        // get user
        self.getUser(userId, function(err, user){
            if( err ){
                callback(err)
                return
            }
            if( user === null ){
                callback(null, self.getError(2))
                return;
            }
            // compare reset codes
            bcrypt.compare(resetCode, user.reset_token, function(err, response){
                if( response !== true ){
                    callback(null, self.getError(6))
                    return;
                }

                if( self.passwordTokenHasExpired(response.reset_token_sent) ){
                    callback(null, self.getError(7))
                    return;
                }
                self.updatePassword({id: userId, password: newPassword}, callback);
            })
        })
    }
};