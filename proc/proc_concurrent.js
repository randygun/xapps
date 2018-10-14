var config = require(__dirname+'/../config');
var pg = require ('pg');
pg.defaults.poolSize = 1000;
var pgConString = "postgres://"+config.db.username+":"+config.db.password+"@"+config.db.server+":5432/"+config.db.db;
var tools_db = require(__dirname+'/../tools/tools_db');

var countconcurrent = function(id_request){
	var param = {
		core: config.cluster.worker.id,
		concurrent_api: config.savedInstance.api,
		id_request: id_request
	};
	tools_db.one('INSERT INTO table_concurrent (core,concurrent_api,id_request) VALUES (${core},${concurrent_api},${id_request}) RETURNING id',param,function(data){console.log('SUCCESS');},function(err){console.log('FAIL');});
};

pg.connect(pgConString, function(err, client, done) {
	if(err) {
		console.log('PGCONNECT FAIL'+err);
		return;
	}
	console.log('PGCONNECT SUCCESS');
	client.on('notification', function(msg) {
		var notification = JSON.parse(msg.payload);
		if(notification.job==="ask_concurrent_count"){
			//HITUNG
			countconcurrent(notification.id);
		}else if(notification.job === 'setting_changed'){
			var key = config.dynamic.setting[notification.id_setting];
			var value = notification.value;
			console.log("NEW VALUE : "+key+";"+value);
			console.log("\nSETTING BEFORE "+JSON.stringify(config.setting)+"\n");
			config.setting[key] = value;
			console.log("\nSETTING AFTER "+JSON.stringify(config.setting)+"\n");
		}
	});
	client.on('error',function(err){
		console.log("PGNOTIFICATION CONCURRENT ERROR "+JSON.stringify(err));
	});
	var query = client.query("LISTEN watch_system");
});