const usernameMinLength = 2;
const passwordMinLength = 8;

module.exports = {

    emailIsValid: function(email){
        var re = /^([\w-]+(?:\.[\w-]+)*)@((?:[\w-]+\.)*\w[\w-]{0,66})\.([a-z]{2,6}(?:\.[a-z]{2})?)$/i;
        return re.test(email);
    },
    passwordIsValid: function(password){
        if( !password ){ return false; }
        if( password.length < passwordMinLength ){ return false; }
        return true;
    },
    usernameIsValid: function(username){
        if( username.length < usernameMinLength ){
            return false;
        }
        return(/^([a-zA-Z0-9]|\-|\_|\.)+$/.test(username));
    }
}