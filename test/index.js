var app = require('express')()

var SqlLoginMiddleware = require('../index')

var TEST_FORM = '' +
    '<!HTML>' +
    '<html>' +
    '    <body>' +
    '        <form>' +
    '            Email:' +
    '            <input type="text" name="email" />' +
    '            Password:' +
    '            <input type="text" name="password" />' +
    '        </form>' +
    '    </body>' +
    '</html>';

app.use('/', require('../index')())

app.get('/test-form', function(req, res){
    res.send(TEST_FORM)
})

/*******************************************************************************

                    START SERVER

*******************************************************************************/

var server = app.listen(3000, function () {

  var host = server.address().address
  var port = server.address().port

  console.log("Example app listening at http://%s:%s", host, port)
})