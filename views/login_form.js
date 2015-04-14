module.exports = function(data){
    return '' +
        '<div class="sql-login-middleware-wrap">' +
            '<form method="POST" action="' + data.rootUrl + '/login">' +
            '    <label>Email:</label>' +
            '    <input type="text" name="email" />' +
            '    <label>Password:</label>' +
            '    <input type="password" name="password" />' +
            '    <input type="submit" />' +
            '</form>'
        '</div>';
}