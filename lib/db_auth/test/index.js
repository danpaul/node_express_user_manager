var runTest = 'rethink'; // either rethink or sql

var knex = require('knex');
var async = require('async');
var assert = require('assert');
var DbAuth = require('../index');
var r = require('rethinkdb');

var dbCreds = {
    client: 'mysql',
    connection: {
        host: 'localhost',
        user: 'root',
        password: 'root',
        database: 'sql_login',
        port:  8889
    }
};

var rethinkCreds =  {
    db: 'db_auth_test',
    host: '127.0.0.1',
    port: '28015'
};

var knex = require('knex')(dbCreds)
var dbAuth;
var user;
var resetCode;

var username = 'user_' + Date.now();
var email = 'user_' + Date.now(); + '@foo.com';

async.waterfall([
    // initialize dbAuth
    function(callback){
        if( runTest === 'rethink' ){
            r.connect(rethinkCreds, function(err, conn) {
                if( err ){ return callback(err); }
                dbAuth = new DbAuth({
                    rethinkConnection: conn,
                    databaseName: 'db_auth_test',
                    tableName: 'db_auth_test_table'
                }, callback);
            });
        } else {
            dbAuth = new DbAuth({
                'knex': knex,
                'tableName': 'user_test'
            }, callback)
        }
    },
    // clear table
    function(callback){
        console.log('Table initialized');
        if( runTest === 'sql' ){
            knex('user_test').truncate()
                .then(function(){ callback(); })
                .catch(callback)
        } else {
            callback();
        }
    },
    // create user
    function(callback){
        console.log('Data cleared');
        dbAuth.create({
            email: email,
            username: username,
            password: 'asdfasdf'
        }, function(err, response){
            if( err ){ return callback(err) }
console.log(response);
return;
            assert((response.status === 'success'), 'Unable to create user');
            callback();
        })
    },
    // try to recreate same user
    function(callback){
// asdf
return;
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
        });
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
            email: 'foo@email.com', token: user.confirmationToken
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
            assert(response.user.isConfirmed, 'User was not confirmed');
            user = response.user;
            callback()
        })
    },
    // get PW reset code
    function(callback){
        console.log('Got confirmed user');
        dbAuth.getResetCode({
            email: 'foo@email.com'
        }, function(err, response){
            if( err ){ return callback(err); }
            assert(response.status === 'success', 'Could not get user');
            resetCode = response.resetCode;
            callback();
        })
    },
    // reset password
    function(callback){
        console.log('Generated reset code');
        dbAuth.resetPassword({id: user.id,
                              resetCode: resetCode,
                              password: 'zzzzzzzz'}, function(err, response){
            if( err ){ return callback(err); }
            assert(response.status === 'success');
            callback();
        })
    },

    // login with update password
    function(callback){
        console.log('Password reset');
        dbAuth.checkPassword({
            email: 'foo@email.com',
            password: 'zzzzzzzz'
        }, function(err, response){
            if( err ){
                callback(err);
                return;
            }
            assert((response.status === 'success'), 'Update password verification failed')
            callback()
        });
    },
    // delete user
    function(callback){
        console.log('New password verified');
        dbAuth.delete({email: 'foo@email.com'}, function(err, response){
            if( err ){ return callback(err); }
            assert(response.status === 'success');
            callback()
        })
    },
    // try to login deleted user
    function(callback){
        console.log('User deleted');
        dbAuth.checkPassword({
            email: 'foo@email.com',
            password: 'asdfasdf'
        }, function(err, response){
            if( err ){
                callback(err);
                return;
            }
            assert((response.status === 'error'), 'Should not log in deleted user')
            callback()
        })
    },
    function(callback){
        console.log('User confirmed deleted');
        dbAuth.getUser({
            email: 'foo@email.com'
        }, function(err, response){
            if( err ){ return callback(err); }
            assert(response.status === 'success');
            assert(response.user === null);
            console.log('User confirmed to no longer exist');
            callback();
        })
    },
], function(err){
    if( err ){
        console.log(err);
        return;
    }
    console.log('Sql Login tests passed.');
})