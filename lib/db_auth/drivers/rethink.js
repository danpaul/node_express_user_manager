var async = require('async');
var r = require('rethinkdb');
var schemaBuilder = require('../../rethink_schema_builder');

module.exports = function(options){

    if( !options.rethinkConnection ||
        !options.databaseName ||
        !options.tableName ){ throw new Error('Missing options'); }

    this.conn = options.rethinkConnection;
    this.db = options.databaseName;
    this.table = options.tableName;

    this.init = function(callback){
        var schema = {
            db: options.databaseName,
            tables: [
                {
                    tableName: options.tableName,
                    indexes: ['email', 'username']
                }
            ]
        };
        if( options.manageSessions ){
            schema.tables.push({tableName: options.sessionTableName});
        }
        schemaBuilder.build({connection: this.conn, schema: schema}, callback);
    }

    /**
     * @param  {string}  options.username
     */
    this.usernameIsClaimed = function(options, callback){
        r.table(this.table)
            .getAll(options.username, {index: 'username'})
            .count()
            .run(this.conn, function(err, count){
                if( err ){ return callback(err); }
                callback(null, (count > 0));
            });
    }

    /**
     * @param  {string}  options.email
     */
    this.emailIsClaimed = function(options, callback){
        r.table(this.table)
            .getAll(options.email, {index: 'email'})
            .count()
            .run(this.conn, function(err, count){
                if( err ){ return callback(err); }
                callback(null, (count > 0));
            });
    }

    /**
     * @param  {string}  options.password  hashed password
     * @param {string}  options.confirmationToken
     * @param {string}  options.email
     * @param {string}  options.username
     *
     * @return {{userId: int}}
     */
    this.createUser = function(options, callback){

        var user = this._getBaseObject();
        user.email = options.email;
        user.password = options.password;
        user.confirmationToken = options.confirmationToken;
        user.username = options.username;

        r.table(this.table)
            .insert(user)
            .run(this.conn, function(err, result){
                if( err ){ return callback(err); }
                var user = {id: result.generated_keys[0]};
                return callback(null, user);
        });
    }

    /**
     * @param  {options.id}  either id or email is required
     * @param  {options.email}
     */
    this.getUser = function(options, callback){

        if( options.id ){
            r.table(this.table)
                .get(options.id)
                .run(this.conn, callback);
        } else {
            r.table(this.table)
                .getAll(options.email, {index: 'email'})
                .run(this.conn, function(err, cursor){
                    if( err ){ return callback(err); }
                    cursor.toArray(function(err, results){
                        if( !results.length ){ return callback(null, null); }
                        callback(null, results[0]);
                    });
                });
        }
    }

    /**
     * @param  {options.id}  either id or email is required
     * @param  {options.email}
     * @param  {options.password}  hashed password
     */
    this.updatePassword = function(options, callback){
        if( options.id ){
            r.table(this.table)
                .get(options.id)
                .update({password: options.password})
                .run(this.conn, callback);
        } else {
            r.table(this.table)
                .getAll(options.email, {index: 'email'})
                .update({password: options.password})
                .run(this.conn, callback);
        }
    }

    /**
     * Sets user's `isConfirmed` field to 
     * @param {int} options.id
     */
    this.confirmUser = function(options, callback){
        var self = this;
        r.table(this.table)
            .get(options.id)
            .update({isConfirmed: true, confirmationToken: ''})
            .run(this.conn, callback);
    }

    /**
     * @param  {options.id}
     * @param  {options.email}
     */
    this.updateEmail = function(options, callback){
        var self = this;
        r.table(this.table)
            .get(options.id)
            .update({email: options.email})
            .run(this.conn, callback);
    }

    /**
     * @param  {options.id}
     * @param  {options.username}
     */
    this.updateUsername = function(options, callback){
        var self = this;
        r.table(this.table)
            .get(options.id)
            .update({username: options.username})
            .run(this.conn, callback);
    }

    /**
     * @param  {options.id}  either id or email is required
     * @param  {options.email}
     * @param  {options.resetCode} 
     * @param  {options.resetTokenSent}
     */
    this.setResetCode = function(options, callback){
        var updateParams = {
            resetToken: options.resetCode,
            resetTokenSent: options.resetTokenSent
        };
        if( options.id ){
            r.table(this.table)
                .get(options.id)
                .update(updateParams)
                .run(this.conn, callback);
        } else {
            r.table(this.table)
                .getAll(options.email, {index: 'email'})
                .update(updateParams)
                .run(this.conn, callback);
        }
    }

    /**
     * @param  {options.id}  either id or email is required
     * @param  {options.email}
     */
    this.delete = function(options, callback){
        if( options.id ){
            r.table(this.table)
                .get(options.id)
                .delete()
                .run(this.conn, callback);
        } else {
            r.table(this.table)
                .getAll(options.email, {index: 'email'})
                .delete()
                .run(this.conn, callback);
        }
    }

    /**
     * @param  {options.user}  the user object returned from this.getUser
     * @return  array of timestamps
     */
    this.getLoginAttempts = function(options){
        return options.user.loginAttempts;
    }

    /**
     * @param  {options.id}  user ID
     * @param  {options.attempts}  array of timestamps
     */
    this.setLoginAttempts = function(options, callback){
        r.table(this.table)
            .get(options.id)
            .update({loginAttempts: options.attempts})
            .run(this.conn, callback);
    }

    this._getBaseObject = function(){
        return {
            email: '',
            username: '',
            password: '',
            isConfirmed: '',
            confirmationToken: '',
            resetToken: '',
            resetTokenSent: 0,
            loginAttempts: [],
            data: {}
        }
    }
}