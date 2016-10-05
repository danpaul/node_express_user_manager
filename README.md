## About

sql_login_middleware is node middleware providing basic user managment (registration and login) backed by [Knex](http://knexjs.org/) compatible SQL database (Postgres, MSSQL, MySQL, MariaDB, SQLite3, and Oracle).

See test file (./test/index.js) for example usage.

## Testing

`node ./test/index.js`

## Todo

* password reset errors should take you back to original form
* add link to login from register

* after reset token claimed, should be deleted from DB
* Password confirmation
* Resend password confirmation
* refactor
* Login after registration
* Add front end validation to login
* add optional session management
	* https://www.npmjs.com/package/connect-session-knex
* add documentation

* Setup PW reset link
* Add base styling
* Success redirect, success redirect via param?
* Make terms conditional
* Add success register and success login and logout redirect options
* Add email verification
* Add email password reset
* Add email resend verification
* Make backend password validation match front end

* add api/non-api routes for all
* Brute force check