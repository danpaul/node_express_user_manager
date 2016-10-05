var app = require('express')()

var knex = require('knex')
var bodyParser = require('body-parser')
var secret = require('../secret');

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

var sqlLoginMiddleware = require('../index')(app, {
    rootUrl: 'http://localhost:3010/test',
    knex: knex,
    transporter: transporter,
    siteName: 'Test Site',
    sessionSecret: 'super duper secret',
    loginSuccessRedirect: 'http://localhost:3010/test'
});

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));

app.use('/test', sqlLoginMiddleware);

// app.get('/foo', function(req, res){
//     console.log(req.session);
//     res.send('bar');
// })

/*******************************************************************************

                    START SERVER

*******************************************************************************/

var server = app.listen(3010, function () {
    var host = server.address().address
    var port = server.address().port

    console.log("Example app listening at http://%s:%s", host, port)
})