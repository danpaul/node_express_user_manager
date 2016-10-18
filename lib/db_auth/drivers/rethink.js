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