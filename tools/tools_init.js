module.exports = this;
var instance = this;
var tools_event = require(__dirname+"/tools_event");
var tools_db = require(__dirname+"/tools_db");
var NodeRSA = require('node-rsa');

var querySettings = function(){
	tools_db.manyOrNone("SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname='public' AND position('constant' IN tablename)=1",undefined,function(data){
		console.log("INIT QUERYSETTING "+JSON.stringify(data));
		instance.dynamic = {};
		instance.setting = {};
		instance.description = {};
		var max = data.length;
		var i = 0;
		data.forEach(function(row){
			var constant = [];
			if(row.tablename.indexOf('constant_')===0){
				//ADA
				constant.push(row.tablename);
			}
			var checkMax = function(){
				i++;
				console.log("i: "+i+" of max: "+max);
				if(i>=max){
					console.log('Dynamic '+JSON.stringify(instance.dynamic));
					tools_db.manyOrNone('SELECT csetting.code, settings.value FROM table_settings settings LEFT JOIN constant_setting csetting ON csetting.id=settings.id_setting LEFT JOIN (SELECT MAX(id) AS maxid FROM table_settings GROUP BY id_setting) maxsettings ON maxsettings.maxid=settings.id WHERE maxsettings.maxid IS NOT NULL',undefined,function(data){
						data.forEach(function(item){
							if(item.code==="fee_delivery") instance.setting[item.code] = JSON.parse(item.value);
							else instance.setting[item.code] = item.value;
						});
						console.log("INIT FINISH SETTINGS "+JSON.stringify(instance.setting));
						tools_event.finishSetting();
					},function(err){

					});					
				}
			}

			constant.forEach(function(tablename){
				tools_db.manyOrNone("SELECT id,code,description FROM "+tablename,undefined,function(rows){
					instance.dynamic[tablename.split("_")[1]] = {};
					instance.description[tablename.split("_")[1]] = {};
					rows.forEach(function(data){
						console.log('ID: '+tablename+';'+data.id);
						console.log('CODE: '+tablename+';'+data.code);
						console.log('DESCRIPTION: '+tablename+';'+data.code+";"+data.description);
						instance.dynamic[tablename.split("_")[1]][data.id] = data.code;
						instance.dynamic[tablename.split("_")[1]][data.code] = data.id;
						instance.description[tablename.split("_")[1]][data.code] = data.description;
					});
					console.log('Before Max: '+JSON.stringify(instance.dynamic)+";"+JSON.stringify(rows));
					console.log("INIT DYNAMIC "+JSON.stringify(instance.dynamic));
					checkMax();
				},function(err){

				});
			});
		});
	},function(err){
		console.log("Query Settings Failing");
	});
};

var fs = require('fs');
fs.readFile( __dirname + '/../key/private_unencrypted.pem', function (err, data) {
  	if (err) {
    	throw err; 
	}
	console.log(data.toString());
	instance.privateRSA = data.toString();
	var key = new NodeRSA(data.toString());
	var text = '{}';
	var encrypted = key.encrypt(text, 'base64');
	console.log('encrypted: ', encrypted);
	var decrypted = key.decrypt(encrypted, 'utf8');
	console.log('decrypted: ', decrypted);
	// instance.keyRSA = key;
	querySettings();
});