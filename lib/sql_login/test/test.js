(function(){

var knex = require('knex')
var async = require('async')
var assert = require('assert')

var SqlLogin = require('../index')

var dbCreds = {
    client: 'mysql',
    connection: {
        host: 'localhost',
        user: 'root',
        password: 'root',
        database: 'sql_login',
        port:  8889
    }
}

var knex = require('knex')(dbCreds)
var sqlLogin;

async.waterfall([

    // initialize sqlLogin
    function(callback){
        sqlLogin = new SqlLogin({
            'knex': knex,
            'tableName': 'user_test'
        }, callback)
    },

    // clear table
    function(callback){
        knex('user_test').truncate()
            .then(function(){ callback(); })
            .catch(callback)
    },

    // create user
    function(callback){
        sqlLogin.create({
            email: 'foo@email.com',
            password: 'asdfasdf'
        }, function(err, response){
            if( err ){
                callback(err)
                return;
            }
            assert((response.status === 'success'), 'Unable to create user');
            callback();
        })
    },

    // try to recreate same user
    function(callback){
        sqlLogin.create({
            email: 'foo@email.com',
            password: 'asdfasdf'
        }, function(err, response){
            if( err ){
                callback(err)
                return;
            }
            assert((response.status === 'failure'), 'User creation should have failed');
            callback();
        })
    },

    // check password
    function(callback){
        sqlLogin.checkPassword({
            email: 'foo@email.com',
            password: 'asdfasdf'
        }, function(err, response){
            if( err ){
                callback(err);
                return;
            }
            assert((response.status === 'success'), 'Password verification failed')
            callback()
        })
    },

    // try to login with bad password
    function(callback){
        sqlLogin.checkPassword({
            email: 'foo@email.com',
            password: 'asdfasdfX'
        }, function(err, response){
            if( err ){
                callback(err);
                return;
            }
            assert((response.status === 'failure'), 'Bad password allowed to login')
            callback()
        })
    },

    // try to login with bad email
    function(callback){
        sqlLogin.checkPassword({
            email: 'foo@email.comX',
            password: 'asdfasdf'
        }, function(err, response){
            if( err ){
                callback(err);
                return;
            }
            assert((response.status === 'failure'), 'Bad email allowed to login')
            callback()
        })
    },

    // update password
    function(callback){
        sqlLogin.updatePassword({
            email: 'foo@email.com',
            password: 'fdsafdsa'
        }, function(err, response){
            if( err ){
                callback(err);
                return;
            }
            assert((response.status === 'success'), 'Password should have been updated')
            callback()
        })
    },

    // check new password
    function(callback){
        sqlLogin.checkPassword({
            email: 'foo@email.com',
            password: 'fdsafdsa'
        }, function(err, response){
            if( err ){
                callback(err);
                return;
            }
            assert((response.status === 'success'), 'Update password verification failed')
            callback()
        })
    },

    // delete user
    function(callback){
        sqlLogin.deleteUser('foo@email.com', function(err, response){
            if( err ){
                callback(err);
                return;
            }
            callback()
        })
    },

    // try to login deleted user
    function(callback){
        sqlLogin.checkPassword({
            email: 'foo@email.com',
            password: 'asdfasdf'
        }, function(err, response){
            if( err ){
                callback(err);
                return;
            }
            assert((response.status === 'failure'), 'Should not log in deleted user')
            assert((response.code === '2'), 'Should not log in deleted user')
            callback()
        })
    },

], function(err){
    if( err ){
        console.log(err);
        return;
    }
    console.log('Sql Login tests passed.')

})


}())