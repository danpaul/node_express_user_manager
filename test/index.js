var app = require('express')()

var knex = require('knex')
var bodyParser = require('body-parser')
var session = require('express-session')
var flash = require('connect-flash')

// smtp creds
var secret = require('../secret');

var nodemailer = require('nodemailer');
var smtpTransport = require('nodemailer-smtp-transport');

var transporter = nodemailer.createTransport(smtpTransport(secret.smtp));

// console.log(transporter);
// console.log(secret);



// setup e-mail data with unicode symbols
// var mailOptions = {
//     from: '"Fred Foo ?" <foo@blurdybloop.com>', // sender address
//     to: 'pt2323@gmail.com', // list of receivers
//     subject: 'Test', // Subject line
//     text: 'This is a test message', // plaintext body
//     html: '<b>This is a test message</b>' // html body
// };

// // send mail with defined transport object
// transporter.sendMail(mailOptions, function(error, info){
//     if(error){
//         return console.log(error);
//     }
//     console.log('Message sent: ' + info.response);
// });






// CORS middleware
// http://stackoverflow.com/questions/7067966/how-to-allow-cors-in-express-node-js
// var allowCrossDomain = function(req, res, next) {
//     res.header('Access-Control-Allow-Origin', '*');
//     res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
//     res.header('Access-Control-Allow-Headers', 'Content-Type');
//     next();
// }

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
    rootUrl: 'http://localhost:3010',
    'knex': knex,
    transporter: transporter,
    siteName: 'Test Site'
})

app.use(require('cookie-parser')('super-secret')); 
app.use(session({
    secret: 'super-secret',
    resave: true,
    saveUninitialized: true
}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));
app.use(flash())
// app.use(allowCrossDomain)

app.use('/', sqlLoginMiddleware)

/*******************************************************************************

                    START SERVER

*******************************************************************************/

var server = app.listen(3010, function () {
    var host = server.address().address
    var port = server.address().port

    console.log("Example app listening at http://%s:%s", host, port)
})