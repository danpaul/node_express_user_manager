## About

node_express_user_manager is a complete drop-in solution for user management. node_express_user_manager is [Express](https://expressjs.com/) middleware and is compatible with any database supported by [Knex](http://knexjs.org/) (Postgres, MSSQL, MySQL, MariaDB, SQLite3, and Oracle) or RethinkDB. node_express_user_manager also provides optional session management via [connect-session-knex](https://github.com/llambda/connect-session-knex) for SQL and [express-session-rethinkdb](https://github.com/llambda/session-rethinkdb) for RethinkDB.

node_express_user_manager supports the following featues:
* Registration
* Login
* Logout
* Brute force login prevention
* Email confirmation(cofirms user's email)
* Password reset
* Session management(optional)

## Screenshots

![Register](/lib/screenshots/register.png?raw=true "Register")

![Register Errors](/lib/screenshots/register-error.png?raw=true "Register")

![Login](/lib/screenshots/login.png?raw=true "Login")

![Password Reset](/lib/screenshots/password-reset.png?raw=true "Password Reset")

![Profile Update](/lib/screenshots/profile.png?raw=true "Profile Update")

## Dependencies
node_express_user_manager requires an initialized Knex object or RethinkDB connection configuration and an initialized [Nodemailer](https://github.com/nodemailer/nodemailer) tansporter (to handle password resets and email confirmations).

## Example Usage

```javascript
var app = require('express')()

var knex = require('knex')
var bodyParser = require('body-parser')
var secret = require('../secret'); // nodemailer SMTP config

var nodemailer = require('nodemailer');
var smtpTransport = require('nodemailer-smtp-transport');

var transporter = nodemailer.createTransport(smtpTransport(secret.smtp));

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

var userManager = require('node_express_user_manager')(app, {
    rootUrl: 'http://localhost:3010/user', // should match the middleware root
    knex: knex,
    transporter: transporter,
    siteName: 'Test Site',
    sessionSecret: 'super duper secret',
    loginSuccessRedirect: 'http://localhost:3010/success'
});

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));

app.use('/user', userManager);

var server = app.listen(80, function () {
    var host = server.address().address
    var port = server.address().port

    console.log("Example app listening at http://%s:%s", host, port)
})

```

### Example RehtinkDB config

```
var options = {
    rootUrl: 'http://localhost:3010/user', // should match the middleware root
    rethinkConnectionOptions: {
        db: 'db_auth_test',
        host: '127.0.0.1',
        port: '28015'
    },
    databaseName: 'db_auth_test',
    tableName: 'db_auth_test_table',
    transporter: transporter,
    siteName: 'Test Site',
    sessionSecret: 'super duper secret',
    loginSuccessRedirect: 'http://localhost:3010/success'
}

var userManager = require('../index')(app, options);

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));

app.use('/user', userManager);
```

## Documentation

### Session info

After registration or login, session will include a user object with a `user.id` property (you can check this to determine if the user is logged in)

### Initialization:

`npm install node_express_user_manager`

`var userManager = require('node_express_user_manager')(app, options);`

### Options

`options.databaseName` - required if using RethinkDB

`options.knex` - required - initialized Knex object

`options.loginSuccessRedirect` - optional - url to redirect user to after successful login

`options.manageSessions` - optional - defaults to `true`. If true, user sessions get stored in DB

`options.registerSuccesRedirect` - optional - url to redirect user to after registration

`options.rethinkConnectionOptions` - required if using RethinkDB - see [connection options](https://www.rethinkdb.com/docs/install-drivers/)javascript/

`options.requireTerms` - optional - if true, registration will include a checkbox that user's are required to check indicating they agree to the terms

`options.sessionSecret` - required if useing `manageSessions`

`options.sessionExpiration` - optional - session expiration in ms, defaults to 12 hours

`options.sessionSaveUninitialized` - optional - defaults to false

`options.sessionResave` - optional - defaults to false

`options.siteName` - required - name of site

`options.tablename` - optional - defatuls to 'node_express_user_manager'

`options.termsLink` - optional - link for terms if `requireTerms` is used

`options.transporter` - required - Nodemail transporter

### Template Options

`options.bodyBottom` - optional - string that gets injected at the bottom of the body on any node_express_user_manager pages

`options.bodyTop` - optional - string that gets injected at the top of the body on any node_express_user_manager pages

`options.header` - optional - string that gets injected into the header of all node_express_user_manager pages

## Todo
* app profile update page
* send confirmation email on register
* add optional terms checkbox and link for registration
* add api routes for all existing routes