// var runTest = 'sql'; // either rethink or sql
var runTest = 'rethink';
var testDelete = false; // if true, tests delete user. if false, tests brute force

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
var user = null;

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
            console.log('Clearing data...');
        } else {
            callback();
        }
    },
    // create user
    function(callback){
        dbAuth.create({
            email: email,
            username: username,
            password: 'asdfasdf'
        }, function(err, response){
            if( err ){ return callback(err) }
            assert((response.status === 'success'), 'Unable to create user');
            user = response.user;
            console.log('User created');
            callback();
        })
    },
    // try to recreate same user
    function(callback){
        dbAuth.create({
            email: email,
            username: 'baz',
            password: 'asdfasdf'
        }, function(err, response){
            if( err ){ return callback(err); }
            assert((response.status === 'error'), 'User creation should have failed');
            console.log('User not recreated');
            callback();
        })
    },
    // check password
    function(callback){
        dbAuth.checkPassword({
            email: email,
            password: 'asdfasdf'
        }, function(err, response){
            if( err ){ return callback(err); }
            assert((response.status === 'success'), 'Password verification failed');
            console.log('Password checked');
            callback();
        })
    },
    // try to login with bad password
    function(callback){
        dbAuth.checkPassword({
            email: 'foo@email.com',
            password: 'asdfasdfX'
        }, function(err, response){
            if( err ){ return callback(err); }
            assert((response.status === 'error'), 'Bad password allowed to login');
            console.log('Bad password could not login');
            callback();
        })
    },
    // get user by id
    function(callback){
        dbAuth.getUser({id: user.id}, function(err, response){
            if( err ){ return callback(err); }
            assert((response.status === 'success'), 'Could not get user by id');
            assert(response.user, 'User missing from get by ID response');
            console.log('Got user by ID');
            callback();
        })
    },
    // try to login with bad email
    function(callback){
        dbAuth.checkPassword({
            email: email + 'Z',
            password: 'asdfasdf'
        }, function(err, response){
            if( err ){ return callback(err); }
            assert((response.status === 'error'), 'Bad email allowed to login');
            console.log('Bad email could not login');
            callback();
        })
    },
    // update password
    function(callback){
        dbAuth.updatePassword({
            email: email,
            password: 'fdsafdsa'
        }, function(err, response){
            if( err ){ return callback(err); }
            assert((response.status === 'success'), 'Password should have been updated');
            console.log('Password updated');
            callback()
        })
    },
    // check new password
    function(callback){
        dbAuth.checkPassword({
            email: email,
            password: 'fdsafdsa'
        }, function(err, response){
            if( err ){ return callback(err); }
            assert((response.status === 'success'), 'Update password verification failed');
            console.log('Password update verified');
            callback();
        });
    },
    // update password by ID
    function(callback){
        dbAuth.updatePassword({
            id: user.id,
            password: 'zzzzzzzz'
        }, function(err, response){
            if( err ){ return callback(err); }
            assert((response.status === 'success'), 'Password should have been updated by ID');
            callback();
        })
    },
    // check new password
    function(callback){
        console.log('Password updated by ID');
        dbAuth.checkPassword({
            email: email,
            password: 'zzzzzzzz'
        }, function(err, response){
            if( err ){ return callback(err); }
            assert((response.status === 'success'), 'Update password verification by ID failed');
            console.log('Password confirmed updated by ID');
            callback()
        });
    },
    // get user
    function(callback){
        dbAuth.getUser({
            email: email
        }, function(err, response){
            if( err ){ return callback(err); }
            assert(response.status === 'success', 'Could not get user');
            assert(response.user, 'Could not get user');
            user = response.user;
            callback()
        });
    },
    // confirm user
    function(callback){
        dbAuth.confirmUser({
            email: email, token: user.confirmationToken
        }, function(err, response){
            if( err ){ return callback(err); }
            assert((response.status === 'success'), 'Confirm user failed');
            console.log('User confirmed');
            callback()
        });
    },
    // get user
    function(callback){        
        dbAuth.getUser({
            email: email
        }, function(err, response){
            if( err ){ return callback(err); }
            assert(response.status === 'success', 'Could not get user');
            assert(response.user, 'Could not get user');
            assert(response.user.isConfirmed, 'User was not confirmed');
            user = response.user;
            console.log('Got confirmed user');
            callback()
        })
    },
    // get PW reset code
    function(callback){
        dbAuth.getResetCode({
            email: email
        }, function(err, response){
            if( err ){ return callback(err); }
            assert(response.status === 'success', 'Could not get user');
            resetCode = response.resetCode;
            console.log('Generated reset code');
            callback();
        })
    },
    // reset password
    function(callback){
        dbAuth.resetPassword({id: user.id,
                              resetCode: resetCode,
                              password: 'yyyyyyyy'}, function(err, response){
            if( err ){ return callback(err); }
            assert(response.status === 'success');
            console.log('Password reset');
            callback();
        })
    },

    // login with update password
    function(callback){
        dbAuth.checkPassword({
            email: email,
            password: 'yyyyyyyy'
        }, function(err, response){
            if( err ){
                callback(err);
                return;
            }
            assert((response.status === 'success'), 'Update password verification failed');
            console.log('New password verified');
            callback();
        });
    },


    // lock out user
    function(callback){
        var count = 0;
        async.doWhilst(function(callback){
            dbAuth.checkPassword({
                email: email,
                password: 'qqqqqqqq'
            }, callback);
        },function(){
            count++;
            return count < 11;
        }, function(err){
            if( err ){ return callback(err); }
            return callback();
        });
    },

    function(callback){
        if( testDelete ){ return callback(); }
        dbAuth.checkPassword({
            email: email,
            password: 'qqqqqqqq'
        }, function(err, response){
            assert(response.status === 'error');
            assert(response.errorCode === 'excessiveLogins');
            console.log('User account locked');
            callback();
        });
    },
    // delete user
    function(callback){
        if( !testDelete ){ return callback(); }
        dbAuth.delete({email: email}, function(err, response){
            if( err ){ return callback(err); }
            assert(response.status === 'success');
            console.log('User deleted');
            callback()
        })
    },
    // try to login deleted user
    function(callback){
        if( !testDelete ){ return callback(); }
        dbAuth.checkPassword({
            email: email,
            password: 'yyyyyyyy'
        }, function(err, response){
            if( err ){ return callback(err); }
            assert((response.status === 'error'), 'Should not log in deleted user');
            console.log('User confirmed deleted');
            callback()
        })
    },
    function(callback){
        if( !testDelete ){ return callback(); }
        dbAuth.getUser({
            email: email
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