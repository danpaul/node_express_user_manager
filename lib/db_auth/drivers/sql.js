var getSchema = function(options){
    var useUsername = options &&
                      options.useUsername &&
                      options.useUsername === true;

    return function(table){
        table.increments();
        table.string('email').index().unique();
        table.string('username').index().unique();
        table.string('password');
        table.boolean('is_confirmed').default(false);
        table.string('confirmation_token').default('');
        table.string('reset_token').default('');
        table.integer('reset_token_sent').default(0);
        table.string('login_attempts').default('[]');
        table.text('data').default('{}');
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
     * Sets user's `is_confirmed` field to 
     * @param {int} options.id
     */
    this.confirmUser = function(options, callback){
        var self = this;
        this.knex(this.tableName)
            .where('id', options.id)
            .update({
                is_confirmed: true,
                confirmation_token: ''
            })
            .then(function(){ return callback(); })
            .catch(callback)
    }

    /**
     * @param  {string}  options.email
     */
    this.emailClaimed = function(options, callback){
        this.knex(this.tableName)
            .where({email: options.email})
            .then(function(user){ return callback(null, (user.length !== 0)); })
            .catch(callback)
    }

    /**
     * @param  {string}  options.username
     */
    this.usernameClaimed = function(options, callback){
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
            confirmation_token: options.confirmationToken,
            username: options.username
        };

        this.knex(this.tableName)
            .insert(insertClause)
            .then(function(response){
                return callback(null, {userId: response[0]});
            })
            .catch(callback)
    }

    /**
     * @param  {options.id}  either id or email is required
     * @param  {options.email}
     */
    this.getUser = function(options, callbackIn){
        if( options.email ){
            var whereClause = {'email': options.email};
        } else {
            var whereClause = {'id': options.id};
        }
        // lookup user
        this.knex(this.tableName)
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

    /**
     * @param  {options.id}  either id or email is required
     * @param  {options.email}
     * @param  {options.password}  hashed password
     */
    this.updatePassword = function(options, callback){
        var self = this;
        if( options.email ){
            var whereClause = {'email': options.email};
        } else {
            var whereClause = {'id': options.id};
        }
        this.knex(this.tableName)
            .where(whereClause)                            
            .update({password: options.password, reset_token: '', reset_token_sent: 0})
            .then(function(){ callback(); })
            .catch(callback)
    }
};