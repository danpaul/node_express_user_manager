(function(){

var _ = require('underscore');
var async = require('async');
var bcrypt = require('bcrypt');
var base64url = require('base64url');
var crypto = require('crypto');
var debug = require('debug')('sql_login');

var ERROR_INIT = 'Incorrect arguments passed to Login on initialization.';

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

var getSchema = function(options){
    var useUsername = options &&
                      options.useUsername &&
                      options.useUsername === true;

    return function(table){
        table.increments()
        table.string('email').index().unique()
        if( useUsername ){
            table.string('username').index().unique()
        }
        table.string('password')
        table.boolean('is_confirmed').default(false)
        table.string('confirmation_token').default('')
        table.string('reset_token').default('')
        table.integer('reset_token_sent').default(0)
    }
}

// Options include: knexObject, tableName, useUsername
module.exports = function(options, callback){

    if( !options.knex || !options.tableName ){
        debug(ERROR_INIT);
        callback(new Error(ERROR_INIT));
        return;
    }

    var self = this;
    self.knex = options.knex;
    self.tableName = options.tableName;
    self.useUsername = options.useUsername ? true : false;
    self.passwordResetExpiration = 60 * 60 * 24; // 24 hours

    this.init = function(){
        debug('Initializing...');
        // check if table exists
        self.knex.schema.hasTable(self.tableName)
            .then(function(exists) {
                if( !exists ){
                    debug('Creating user table');

                    var schema = getSchema(options);

                    // create the table
                    self.knex.schema.createTable(self.tableName, schema)
                        .then(function(){
                            debug('User table created');
                            callback();
                        })
                        .catch(callback)
                } else {
                    debug('User table already exists');
                    callback();
                }
            })
            .catch(callback)
    }

    // options object should include email and password
    // passes back a response object with status, code (on failure), and message (on failure)
    this.checkPassword = function(options, callbackIn){

        // lookup user
        self.getUser(options.email, function(err, userIn){
            if( err ){
                callbackIn(err);
                return;
            }

            // confirm user was returned
            if( userIn === null ){
                callbackIn(null, self.getError(2))
                return;
            }
            var user = userIn;
            // compare passwords

            bcrypt.compare(options.password, user.password, function(err, res) {
                if( err ){
                    callbackIn(err);
                    return;
                }
                if( res !== true ){
                    callbackIn(null, self.getError(3))
                } else {
                    var successObj = self.getSuccess()
                    successObj.userId = user.id
                    successObj.isConfirmed = user.is_confirmed
                    callbackIn(null, successObj)
                }
                
            });
        })
    }


    this.confirmUser = function(identifier, token, callback){
        self.getUser(identifier, function(err, user){
            if( err ){
                callback(err)
                return
            }
            if( user === null ){
                callback(null, self.getError(2))
                return
            }

            if( user.is_confirmed == true ){
                callback(null, self.getSuccess())
                return
            }

            if( user.confirmation_token !== token ){
                callback(null, self.getError(5))
                return
            }

            self.knex(self.tableName)
                .where('id', user.id)
                .update({
                    is_confirmed: true,
                    confirmation_token: ''
                })
                .then(function(){callback(null, self.getSuccess())})
                .catch(callback)
        })
    }

    // options object should include email and password
    // if using username, username is also required
    // passes back a response object with status, code (on failure), and message (on failure)
    this.create = function(options, callbackIn){

        debug('Create user, validating', options);

        var whereClause = {email: options.email};

        if( self.useUsername ){
            whereClause.username = options.username;
        }

        // test if user already exists
        self.knex(self.tableName)
            .where(whereClause)
            .then(function(user){
                if( user.length !== 0 ){
                    debug('User already exists', options);
                    if( self.useUsername ){
                        callbackIn(null, self.getError(8));
                    } else {
                        callbackIn(null, self.getError(1));
                    }
                    return;
                }
                self.createUser(options, callbackIn)
            })
            .catch(callbackIn)
    }

    this.createUser = function(options, callbackIn){

        debug('Creating user', options);
        // hash password
        bcrypt.hash(options.password, 8, function(err, hash) {
            if( err ){
                callbackIn(err)
                return
            }

            var confirmationToken = self.getRandomString()

            var insertClause = {
                email: options.email,
                password: hash,
                confirmation_token: confirmationToken
            };

            if( self.useUsername ){
                insertClause.username = options.username;
            }

            // save user
            self.knex(self.tableName)
                .insert(insertClause)
                .then(function(response){
                    debug('User created');
                    successObject = self.getSuccess();
                    successObject.user = {
                        id: response[0],
                        email: options.email,
                        confirmationToken: confirmationToken
                    }
                    if( self.useUsername ){
                        successObject.username = options.username;
                    }
                    callbackIn(null, successObject)
                })
                .catch(callbackIn)
        });
    }

    this.deleteUser = function(email, callbackIn){
        self.knex(self.tableName)
            .where({'email': email})
            .del()
            .then(function(){ callbackIn(); })
            .catch(callbackIn)
    }

    this.getError = function(errorCode){
        return({
            status: 'failure',
            code: errorCode.toString(),
            message: errorCodes[errorCode.toString()]
        })
    }

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
                        callback(null, response) 
                    })
                    .catch(callback)
            })
        })
    }

    this.getSuccess = function(){ return {status: 'success'} }

    // gets user from email or id, passes back null if user not found, else user object
    this.getUser = function(identifier, callbackIn){

        if( isNaN(identifier) ){
            var whereClause = {'email': identifier};
        } else {
            var whereClause = {'id': identifier};
        }

        // lookup user
        self.knex(self.tableName)
            .where(whereClause)
            .then(function(userIn){
                if( userIn.length === 0 ){
                    callbackIn(null, null)
                } else {
                    callbackIn(null, userIn[0])
                }
            })
            .catch(callbackIn)
    }

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
            // compare reset coes
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

    // takes options with email or id and password (new password)
    // passes back a response object
    this.updatePassword = function(options, callbackIn){

        if( typeof(options.id) !== 'undefined' ){
            var identifier = options.id;
            var whereClause = {id: options.id} 
        } else {
            var identifier = options.email;
            var whereClause = {email: options.email}
        }

        // lookup user
        self.getUser(identifier, function(err, userIn){

            if( err ){
                callbackIn(err);
                return;
            }

            // confirm user was returned
            if( userIn === null ){
                callbackIn(null, self.getError(2))
                return;
            }
            var user = userIn;
            // compare passwords
            bcrypt.compare(options.password, user.password, function(err, res) {
                if( err ){
                    callbackIn(err);
                    return;
                }
                if( res === true ){
                    callbackIn(null, self.getError(4))
                } else {
                    // get hash of new password
                    bcrypt.hash(options.password, 8, function(err, hash) {
                        if( err ){
                            callbackIn(err)
                            return
                        }
                        self.knex(self.tableName)
                            .where(whereClause)                            
                            .update({password: hash})
                            .then(function(){
                                callbackIn(null, self.getSuccess())
                            })
                            .catch(callbackIn)
                    })
                }                
            });
        })
    }

    this.init();

};

}())