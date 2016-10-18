var _ = require('underscore');
var async = require('async');
var debug = require('debug')('sf-services');
var r = require('rethinkdb');

module.exports = {

    /**
        Required:
            options.connection: initialized rethinkdb connection
            options.schema: schema structure use the following structure:
                {
                    db: 'db_name',
                    tables: [{
                        tableName: 'table_name',
                        indexes: ['field_one', 'field_two', {compound_index: ['field_one', 'field_two']'}]
                    }]
                }
    */
    build: function(options, callbackIn){

        if( !options.connection || !options.schema ){
            callbackIn(new Error('Incorrect options passed to schema builder'));
        }
        async.series([

            // check if db exists, create it if not
            function(callback){
                r.dbList().run(options.connection, function(err, dbs){
                    if( err ){
                        callback(err);
                        return;
                    }
                    if( _.contains(dbs, options.schema.db) ){
                        callback();
                        return;
                    }
                    r.dbCreate(options.schema.db).run(options.connection,
                                                      function(err){
                        if( err ){
                            callback(err);
                            return;
                        }
                        callback();
                    });
                })
            },

            // create tables and indexes
            function(callback){
                async.eachSeries(options.schema.tables,
                                 function(table, callbackB){
                    initTable(options.connection,
                              options.schema.db,
                              table,
                              callbackB);

                }, callback);
            }
        ], function(err){
            callbackIn(err);
        });
    },
    /**
        Required:
            options.connection: initialized rethinkdb connection
            options.models: an object containing model objects, keys are used as table names
                if model.indexes is set, that is used, following the pattern documented above, to
                generate the indexes
            options.db: database name
    */
    buildFromModels: function(options, callbackIn){
        var schema = {}
        schema.db = options.db;
        schema.tables = [];
        _.each(options.models, function(v, k){
            var tableSchema = { tableName: k };
            if( v.indexes ){ tableSchema.indexes = v.indexes; }
            schema.tables.push(tableSchema);
        });
        this.build({connection: options.connection, schema: schema},
                   callbackIn);
    }
};



var initTable = function(connection, db, table, callback){
    r.db(db)
        .tableList()
        .run(connection, function(err, tables){
            if( err ){
                callback(err);
                return;
            }

            if( _.contains(tables, table.tableName) ){
                callback();
                return;
            }

            r.db(db)
                .tableCreate(table.tableName)
                .run(connection, function(err){
                    if( err ){
                        callback(err);
                        return;
                    }
                    // create Indexes
                    createIndexes(connection, db, table, callback);
                });
    });
}

var createIndexes = function(connection, db, table, callbackIn){
    var self = this;
    async.eachSeries(table.indexes,
                     function(indexField, callback){

        var query = r.db(db)
            .table(table.tableName);

        if( _.isString(indexField) ){
            query = query.indexCreate(indexField);
        } else if( _.isObject(indexField) ){
            var indexName = _.keys(indexField)[0];
            var indexRows = _.map(indexField[indexName], function(rowName){
                return r.row(rowName);
            });
            query = query.indexCreate(indexName, indexRows);
        }

        query.run(connection, function(err){
            if( err ){
                callback(err);
                return;
            }
            callback();
        });

    }, callbackIn);
}