var bcrypt = require('bcrypt');
var base64url = require('base64url');
var crypto = require('crypto');

const errors = {
    usernameClaimed: 'The username is already taken',
    emailClaimed: 'The username or email is already taken',
    noUser: 'Could not find user',
    invalidPassword: 'Password is not correct',
    newPasswordCanNotMatch: 'New password must be different than previous password',
    invalidToken: 'Token is invalid',
    invalidResetToken: 'Password reset token is invalid',
    expiredResetToken: 'Password reset token has expired',
    excessiveLogins: 'Your account has been locked due to excessive login attempts'
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
    this.maxLoginAttempts = 10;
    this.bruteForceTimePeriod = 60 * 60; // in seconds

    if( options.knex  ){
        if( !options.tableName ){ throw new Error('Missing options'); }
        var SqlDriver = require('./drivers/sql');
        this.driver = new SqlDriver(options);
    } else if( options.rethinkConnection ){
        var RethinkDriver = require('./drivers/rethink');
        this.driver = new RethinkDriver(options);
    } else {
        throw new Error('Missing options');
    }
    this.driver.init(callbackConstructor);

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
        this.driver.usernameIsClaimed(options, function(err, isClaimed){
            if( err ){ return callback(err); }
            if( isClaimed ){
                return getResponse('usernameClaimed', callback);
            }
            self.driver.emailIsClaimed(options, function(err, isClaimed){
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
                confirmationToken: self._getRandomString()
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
        var self = this;
        if( !options.email || !options.password ){
            return callback(new Error('Missing options'));
        }
        this.driver.getUser({email: options.email}, function(err, user){
            if( err ){ return callback(err); }
            if( !user ){ return getResponse('noUser', callback); }
            if( !self._bruteForceCheck({user: user}) ){
// return
                return getResponse('excessiveLogins', callback);
            }
            bcrypt.compare(options.password, user.password, function(err, res){
                if( err ){ return callback(err); }
                if( res !== true ){
                    self._addFailedLoginLog({user: user});
                    return getResponse('invalidPassword', callback);
                }
                var response = getResponse();
                response.user = user;
                return callback(null, response);
            });
        });
    }

    this._addFailedLoginLog = function(options){
        var attempts = this.driver.getLoginAttempts(options);
        var failedAttempts = [];
        var currentTime = this._getCurrentTime();
        var cutoff =  currentTime - this.bruteForceTimePeriod;
        attempts.forEach(function(attempt){
            if( attempt > cutoff ){ failedAttempts.push(attempt); }
        });
        failedAttempts.push(currentTime);
        this.driver.setLoginAttempts({id: options.user.id,
                                      attempts: failedAttempts},
                                     function(err){
            if( err ){ console.log(err); }
        });
    }

    /**
     * @param  {obect}  opitons.user
     */
    this._bruteForceCheck = function(options){

        var attempts = this.driver.getLoginAttempts(options);
        var failedAttempts = 0;
        var cutoff = this._getCurrentTime() - this.bruteForceTimePeriod;
        attempts.forEach(function(attempt){
            if( attempt > cutoff ){ failedAttempts++; }
        });
        return failedAttempts < this.maxLoginAttempts;
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
            if( user.isConfirmed ){
                return getResponse(null, callback);
            }
            if( user.confirmationToken !== options.token ){
                return getResponse('invalidToken', callback);
            }
            self.driver.confirmUser({id: user.id}, function(err){
                if( err ){ return callback(err); }
                return getResponse(null, callback);
            });
        });
    }

    /**
     * Sets up new password reset for user
     * 
     * @param  {options.email}  either options.email or options id required
     * @param  {options.id}
     */
    this.getResetCode = function(options, callback){
        var self = this;
        if( !(options.email || options.id) ){
           return callback(new Error('Missing options'));
        }
        this.driver.getUser(options, function(err, user){
            if( err ){ return callback(err); }
            if( !user ){ return getResponse('noUser', callback); }
            var resetCode = self._getRandomString();
            bcrypt.hash(resetCode, 8, function(err, hash) {
                if( err ){ return callback(err); }
                self.driver.setResetCode({id: user.id,
                                          resetCode: hash,
                                          resetTokenSent: self._getCurrentTime()},
                                         function(err){

                    if( err ){ return callback(err); }
                    var response = getResponse();
                    response.resetCode = resetCode;
                    callback(null, response);
                });
            });
        });
    }

    /**
     * Sets up new password reset for user
     * 
     * @param  {options.id}
     * @param  {options.resetCode}
     * @param  {options.password}
     */
    this.resetPassword = function(options, callback){
        var self = this;
        this.driver.getUser(options, function(err, user){
            if( err ){ return callback(err); }
            if( !user ){ return getResponse('noUser', callback); }
            // compare reset codes
            bcrypt.compare(options.resetCode, user.resetToken, function(err, response){
                if( err ){ return callback(err); }
                if( response !== true ){
                    return getResponse('invalidResetToken', callback);
                }
                if( self._passwordTokenHasExpired(response.resetTokenSent) ){
                    return getResponse('expiredResetToken', callback);
                }
                self.updatePassword(options, function(err){
                    if( err ){ return callback(err); }
                    return getResponse(null, callback);
                });
            });
        });
    }

    /**
     * Permanently deletes user
     * 
     * @param  {options.email}  either options.email or options id required
     * @param  {options.id}
     */
    this.delete = function(options, callback){
        if( !(options.email || options.id) ){
           return callback(new Error('Missing options'));
        }
        this.driver.delete(options, function(err){
            if( err ){ return callback(err); }
            return getResponse(null, callback);
        });
    }

    this._getRandomString = function(){
        return base64url(crypto.randomBytes(48))
    }

    this._getCurrentTime = function(){
        return Math.floor(Date.now()/1000);
    }

    this._passwordTokenHasExpired = function(resetTokenSent){
        var currentTime = this._getCurrentTime();
        return( (currentTime - this.passwordResetExpiration) < resetTokenSent )
    }
};