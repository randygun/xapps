var config = require(__dirname+"/../config");

module.exports = this;

var mysql = require('mysql');
var vpool;
var sqlParam = {
    host: config.db.server, 
    user: config.db.username, 
    password: config.db.password,
    database: config.db.dbmysql,
    dateStrings: true
};

vpool = mysql.createPool(sqlParam);

this.query = function(script,callback_ok,callback_err){
	vpool.getConnection(function(err, connection) {
        if (err){
        	console.log("CONNERR "+JSON.stringify(err));
        	callback_err(err);
        	return;
        }
        // Use the connection
        connection.query(script, function(err, results) {
            // And done with the connection.
            connection.release();
            if (err){
            	callback_err(err);
            	return;
            }
            callback_ok(results);
              // Don't use the connection here, it has been returned to the pool.
        });
    });
};