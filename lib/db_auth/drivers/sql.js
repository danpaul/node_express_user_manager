var getSchema = function(options){
    var useUsername = options &&
                      options.useUsername &&
                      options.useUsername === true;

    return function(table){
        table.increments();
        table.string('email').index().unique();
        table.string('username').index().unique();
        table.string('password');
        table.boolean('isConfirmed').default(false);
        table.string('confirmationToken').default('');
        table.string('resetToken').default('');
        table.integer('resetTokenSent').default(0);
        table.string('loginAttempts').default('[]');
        table.text('data');
    }
}

// Options include: knexObject, tableName, useUsername
module.exports = function(options){

    if( !options.knex || !options.tableName ){
        throw new Error('Missing options');
    }

    this.knex = options.knex;
    this.tableName = options.tableName;

    this.init = function(callback){
        var self = this;
        // check if table exists
        this.knex.schema.hasTable(this.tableName)
            .then(function(exists) {
                if( exists ){ return callback(); }
                var schema = getSchema(options);
                self.knex.schema.createTable(self.tableName, schema)
                    .then(function(){ callback(); })
                    .catch(callback)
            })
            .catch(callback)
    }

    /**
     * Sets user's `isConfirmed` field to 
     * @param {int} options.id
     */
    this.confirmUser = function(options, callback){
        var self = this;
        this.knex(this.tableName)
            .where('id', options.id)
            .update({
                isConfirmed: true,
                confirmationToken: ''
            })
            .then(function(){ return callback(); })
            .catch(callback)
    }

    /**
     * @param  {string}  options.email
     */
    this.emailIsClaimed = function(options, callback){
        this.knex(this.tableName)
            .where({email: options.email})
            .then(function(user){
                return callback(null, (user.length !== 0)); 
            })
            .catch(callback)
    }

    /**
     * @param  {string}  options.username
     */
    this.usernameIsClaimed = function(options, callback){
        this.knex(this.tableName)
            .where({username: options.username})
            .then(function(user){ return callback(null, (user.length !== 0)); })
            .catch(callback)
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
        var insertClause = {
            email: options.email,
            password: options.password,
            confirmationToken: options.confirmationToken,
            username: options.username,
            data: '{}'
        };

        this.knex(this.tableName)
            .insert(insertClause)
            .then(function(response){
                return callback(null, {id: response[0]});
            })
            .catch(callback)
    }

    /**
     * @param  {options.id}  either id or email is required
     * @param  {options.email}
     *
     * Passes back null instead of user if not found
     */
    this.getUser = function(options, callback){
        this.knex(this.tableName)
            .where(this._getWhereClause(options))
            .then(function(userIn){
                if( userIn.length === 0 ){
                    callback(null, null)
                } else {
                    callback(null, userIn[0])
                }
            })
            .catch(callback)
    }

    /**
     * @param  {options.id}  either id or email is required
     * @param  {options.email}
     * @param  {options.password}  hashed password
     */
    this.updatePassword = function(options, callback){
        this.knex(this.tableName)
            .where(this._getWhereClause(options))                            
            .update({password: options.password, resetToken: '', resetTokenSent: 0})
            .then(function(){ callback(); })
            .catch(callback)
    }

    /**
     * @param  {options.id}
     * @param  {options.email}
     */
    this.updateEmail = function(options, callback){
        this.knex(this.tableName)
            .where({id: options.id})
            .update({email: options.email})
            .then(function(){ callback(); })
            .catch(callback)
    }

    /**
     * @param  {options.id}
     * @param  {options.username}
     */
    this.updateUsername = function(options, callback){
        this.knex(this.tableName)
            .where({id: options.id})
            .update({username: options.username})
            .then(function(){ callback(); })
            .catch(callback)
    }

    /**
     * @param  {options.id}  either id or email is required
     * @param  {options.email}
     * @param  {options.resetCode} 
     * @param  {options.resetTokenSent}
     */
    this.setResetCode = function(options, callback){
        this.knex(this.tableName)
            .where(this._getWhereClause(options))
            .update({
                resetToken: options.resetCode,
                resetTokenSent: options.resetTokenSent
            })
            .then(function(){ callback(); })
            .catch(callback);
    }

    /**
     * @param  {options.id}  either id or email is required
     * @param  {options.email}
     */
    this.delete = function(options, callback){
        this.knex(this.tableName)
            .where(this._getWhereClause(options))
            .del()
            .then(function(){ callback(); })
            .catch(callback)
    }

    /**
     * @param  {options.user}  the user object returned from this.getUser
     * @return  array of timestamps
     */
    this.getLoginAttempts = function(options){
        return JSON.parse(options.user.loginAttempts);
    }

    /**
     * @param  {options.id}  user ID
     * @param  {options.attempts}  array of timestamps
     */
    this.setLoginAttempts = function(options, callback){
        var loginAttempts = JSON.stringify(options.attempts);
        this.knex(this.tableName)
            .where({id: options.id})
            .update({loginAttempts: loginAttempts})
            .then(function(){ callback(); })
            .catch(callback)
    }

    this._getWhereClause = function(options){
        if( options.email ){
            return {'email': options.email};
        } else {
            return {'id': options.id};
        }
    }
}