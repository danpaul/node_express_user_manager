## About

sql_login_middleware is node middleware providing basic user managment (registration and login) backed by [Knex](http://knexjs.org/) compatible SQL database (Postgres, MSSQL, MySQL, MariaDB, SQLite3, and Oracle).

See test file (./test/index.js) for example usage.

## Testing

`node ./test/index.js`

## Todo

* Login after registration
* Add front end validation to login
* Make terms conditional
* Add success register and success login and logout redirect options
* Add email verification
* Add email password reset
* Add email resend verification
* Make backend password validation match front end