## About

sql_user_manager is a complete drop-in middleware solution for user management. sql_user_manager is [Express](https://expressjs.com/) middleware and is compatible with any database supported by [Knex](http://knexjs.org/) SQL query builder (Postgres, MSSQL, MySQL, MariaDB, SQLite3, and Oracle). sql_user_manager also provides optional Knex backed session management via [connect-session-knex](https://github.com/llambda/connect-session-knex).

sql_user_manager supports the following featues:
* Registration
* Login
* Logout
* Email Confirmation
* Password reset
* Session management(optional)

## Screenshots

![Register](/lib/screenshots/register.png?raw=true "Register")

![Register Errors](/lib/screenshots/register-error.png?raw=true "Register")

![Login](/lib/screenshots/login.png?raw=true "Login")

![Password Reset](/lib/screenshots/password-reset.png?raw=true "Password Reset")

## Depedencies
sql_user_manager requires an initialize Knex object and an initialized (Nodemailer)[https://github.com/nodemailer/nodemailer] tansporter (to handle password resets and email confirmations).

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

var sqlLoginMiddleware = require('./index')(app, {
    rootUrl: 'http://localhost:3010/test',
    knex: knex,
    transporter: transporter,
    siteName: 'Test Site',
    sessionSecret: 'super duper secret',
    loginSuccessRedirect: 'http://localhost:3010/test'
});

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));

app.use('/auth', sqlLoginMiddleware);

var server = app.listen(3010, function () {
    var host = server.address().address
    var port = server.address().port

    console.log("Example app listening at http://%s:%s", host, port)
})

```

## Documentation

### Session info

After registration or login, session will include a user objection with a `user.id` property (you can check this to determin if the user is logged in)

### Initialization:
`var sqlUserAuth = require('./path_to_module')(app, options);`

### Options

`options.knex` - required - initialized Knex object

`options.loginSuccessRedirect` - optional - url to redirect user to after successful login

`options.manageSessions` - optional - defaults to `true`. If true, user sessions get stored in DB

`options.registerSuccesRedirect` - optional - url to redirect user to after registration

`options.requireTerms` - optional - if true, registration will include a checkbox that user's are required to check indicating they agree to the terms

`options.sessionSecret` - required if useing `manageSessions`

`options.sessionExpiration` - optional - session expiration in ms, defaults to 12 hours

`options.termsLink` - optional - link for terms if `requireTerms` is used

`options.tablename` - optional - defatuls to 'sql_user_auth'

`options.transporter` - required - Nodemail transporter

`options.siteName` - required - name of site

### Template Options

`options.bodyBottom` - optional - string that gets injected at the bottom of the body on any sql_user_auth pages

`options.bodyTop` - optional - string that gets injected at the top of the body on any sql_user_auth pages

`options.header` - optional - string that gets injected into the header of all sql_user_auth pages

## Testing

`node ./test/index.js`

## Todo

* add brute force checke
* add optional terms checkbox and link for registration
* add api routes for all existint routes