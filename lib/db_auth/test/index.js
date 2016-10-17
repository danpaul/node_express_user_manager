var knex = require('knex')
var async = require('async')
var assert = require('assert')

var DbAuth = require('../index')

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
var dbAuth;
var user;

async.waterfall([

    // initialize dbAuth
    function(callback){
        dbAuth = new DbAuth({
            'knex': knex,
            'tableName': 'user_test'
        }, callback)
    },

    // clear table
    function(callback){
        console.log('Table initialized');
        knex('user_test').truncate()
            .then(function(){ callback(); })
            .catch(callback)
    },

    // create user
    function(callback){
        console.log('Data cleared');
        dbAuth.create({
            email: 'foo@email.com',
            username: 'bar',
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
        console.log('User created');
        dbAuth.create({
            email: 'foo@email.com',
            username: 'baz',
            password: 'asdfasdf'
        }, function(err, response){
            if( err ){
                callback(err)
                return;
            }
            assert((response.status === 'error'), 'User creation should have failed');
            callback();
        })
    },

    // check password
    function(callback){
        console.log('User not recreated');
        dbAuth.checkPassword({
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
        console.log('Password checked');
        dbAuth.checkPassword({
            email: 'foo@email.com',
            password: 'asdfasdfX'
        }, function(err, response){
            if( err ){
                callback(err);
                return;
            }
            assert((response.status === 'error'), 'Bad password allowed to login')
            callback()
        })
    },

    // try to login with bad email
    function(callback){
        console.log('Bad password could not login');
        dbAuth.checkPassword({
            email: 'foo@email.comX',
            password: 'asdfasdf'
        }, function(err, response){
            if( err ){
                callback(err);
                return;
            }
            assert((response.status === 'error'), 'Bad email allowed to login')
            callback()
        })
    },

    // update password
    function(callback){
        console.log('Bad email could not login');
        dbAuth.updatePassword({
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
        console.log('Password updated');
        dbAuth.checkPassword({
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

    // get user
    function(callback){
        console.log('Password confirmed updated');
        dbAuth.getUser({
            email: 'foo@email.com'
        }, function(err, response){
            if( err ){ return callback(err); }
            assert(response.status === 'success', 'Could not get user');
            assert(response.user, 'Could not get user');
            user = response.user;
            callback()
        })
    },

    // confirm user
    function(callback){
        dbAuth.confirmUser({
            email: 'foo@email.com', token: user.confirmation_token
        }, function(err, response){
            if( err ){ return callback(err); }
            assert((response.status === 'success'), 'Confirm user failed');
            callback()
        })
    },

    // get user
    function(callback){
        console.log('User confirmed');
        dbAuth.getUser({
            email: 'foo@email.com'
        }, function(err, response){
            if( err ){ return callback(err); }
            assert(response.status === 'success', 'Could not get user');
            assert(response.user, 'Could not get user');
            assert(response.user.is_confirmed, 'User was not confirmed');
            user = response.user;
            callback()
        })
    },

    // reset password

    // update get user

    // delete user
    function(callback){
return;
        console.log('Password check worked');
        dbAuth.deleteUser('foo@email.com', function(err, response){
            if( err ){
                callback(err);
                return;
            }
            callback()
        })
    },

    // try to login deleted user
    function(callback){
        dbAuth.checkPassword({
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