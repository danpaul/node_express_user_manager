var app = require('express')()

var knex = require('knex')
var bodyParser = require('body-parser')
var session = require('express-session')
var flash = require('connect-flash')

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

var sqlLoginMiddleware = require('../index')({
    rootUrl: 'http://localhost:3000',
    'knex': knex
})

app.use(session({
    secret: 'super-secret',
    resave: true,
    saveUninitialized: true
}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));
app.use(flash())

app.use('/', sqlLoginMiddleware)

/*******************************************************************************

                    START SERVER

*******************************************************************************/

var server = app.listen(3000, function () {
    var host = server.address().address
    var port = server.address().port

    console.log("Example app listening at http://%s:%s", host, port)
})