This module is designed to be a simple back end component for user authentication but is considered incomplete on its own. The module requires intialization of a [Knex object](http://knexjs.org).

This module prvoides:
* Basic user email and password storage, hashing and verification backed by knex compatible SQL DB (Postgres, MySQL, MariaDB, SQLite3).
* User verification management (generates key to send to user and confirm once user clicks on link)
* Password reset tokens

This module does not provide:
* Session management.
* Credential validation (i.e. email validation)

See test/test.js for usage example. Check out the code or message me if you have any questions.