const errors = {
    system: 'A system error occurred. Please try again.',
    invalidEmail: 'The email is not valid.',
    invalidLoginEmail: 'Email is not correct.',
    invalidPassword: 'The password is not valid.',
    invalidUsername: 'The username can only contain letters, numbers, underscores, dots and dashes',
    userNotLoggedIn: 'User is not logged in.',
    missingParams: 'Required data is missing',
    unknown: 'An unknown error occurred'
}

module.exports = {
    error: errors,
    /**
     * If there is  an error, pass in an `errorCode` params. Define error code
     *  if it's not already defined above.
     *  
     * On success, nothing is required, a data param is optional.
     *
     * Callback is optional
     */
    get: function(responseIn, callback){
        if( !responseIn ){ responseIn = {}; }
        var response = {
            status: 'success',
            error: null,
            errorCode: null,
            data: null
        };
        if( responseIn.errorCode ){ response.status = 'error'; }
        if( responseIn.data ){ response.data = responseIn.data; }
        if( responseIn.errorCode ){
            response.errorCode = errors[responseIn.errorCode] ?
                                 responseIn.errorCode : 'unknown';
            response.error = errors[response.errorCode];
        }
        if( callback ){
            return callback(null, response);
        } else {
            return response;
        }
    }
}