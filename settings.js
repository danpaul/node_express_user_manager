var _ = require('underscore');

const DEFAULTS = {
    databaseName: null,
    knex: null,
    loginSuccessRedirect: null,
    manageSessions: true,
    registerSuccesRedirect: '',
    requireTerms: false,
    rethinkConnection: null,
    sessionExpiration: 1000 * 60 * 60 * 12,
    sessionResave: false,
    sessionSaveUninitialized: false,    
    sessionSecret: null, // required if middleware is managing session    
    siteName: null,
    tableName: 'db_user_manager',
    termsLink: '',
    transporter: null,
    usernameMinLength: 2,

    // template options:
    bodyBottom: '',
    bodyTop: '',
    header: '',
}


module.exports = function(instance, settings){

    if( !settings ){ settings = {}; }

    _.each(DEFAULTS, function(v, k){
        if( typeof(settings[k]) !== 'undefined' ){ instance[k] = settings[k] }
        else { instance[k] = DEFAULTS[k] }
    })

    if( instance.knex === null && instance.rethinkConnection === null ){
        throw(new Error('Missing DB connection'));
    }

    if( instance.rethinkConnection && !instance.databaseName ){
        throw(new Error('Missing `databaseName`'));
    }

    if( !instance.transporter ){
        throw(new Error('Missing Nodemailer transporter'));
    }

    if( !instance.siteName ){
        throw(new Error('Missing siteName'));
    }
}