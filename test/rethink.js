var app = require('express')()

var knex = require('knex')
var bodyParser = require('body-parser')
var secret = require('../secret');

var nodemailer = require('nodemailer');
var smtpTransport = require('nodemailer-smtp-transport');

var transporter = nodemailer.createTransport(smtpTransport(secret.smtp));
var r = require('rethinkdb');

var rethinkCreds =  {
    db: 'db_auth_test',
    host: '127.0.0.1',
    port: '28015'
};

r.connect(rethinkCreds, function(err, conn){
    if( err ){ throw(err); }

    var options = {
        rootUrl: 'http://localhost:3010/test',
        rethinkConnection: conn,
        databaseName: 'db_auth_test',
        tableName: 'db_auth_test_table',
        transporter: transporter,
        siteName: 'Test Site',
        sessionSecret: 'super duper secret',
        loginSuccessRedirect: 'http://localhost:3010/test'
    }

    var sqlLoginMiddleware = require('../index')(app, options);

    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({extended: true}));

//     app.use('/test', sqlLoginMiddleware);

app.get('/foo', function(req, res){
    res.send('foo');
})

    /*******************************************************************************

                        START SERVER

    *******************************************************************************/

    var server = app.listen(3000, function () {
        var host = server.address().address
        var port = server.address().port

        console.log("Example app listening at http://%s:%s", host, port)
    });

});