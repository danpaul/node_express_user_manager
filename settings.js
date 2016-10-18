var _ = require('underscore');

const DEFAULTS = {
    tableName: 'db_user_manager',
    knex: null,
    loginSuccessRedirect: null,
    manageSessions: true,
    sessionSecret: null, // required if middleware is managing session
    sessionExpiration: 1000 * 60 * 60 * 12,
    usernameMinLength: 2,
    requireTerms: false,
    termsLink: '',
    registerSuccesRedirect: '',
    transporter: null,
    siteName: null,

    // template options:
    header: '',
    bodyTop: '',
    bodyBottom: ''
}


module.exports = function(instance, settings){

    if( !settings ){ settings = {}; }

    _.each(DEFAULTS, function(v, k){
        if( typeof(settings[k]) !== 'undefined' ){ instance[k] = settings[k] }
        else { instance[k] = DEFAULTS[k] }
    })

    if( instance.knex === null ){
        throw(new Error('Missing knex object'));
    }

    if( !instance.transporter ){
        throw(new Error('Missing Nodemailer transporter'));
    }

    if( !instance.siteName ){
        throw(new Error('Missing siteName'));
    }

}