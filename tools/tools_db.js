module.exports = this;

var config = require(__dirname+"/../config");

var pgp = require("pg-promise")(/*options*/);
console.log(JSON.stringify(config));
var db = pgp("postgres://"+config.db.username+":"+config.db.password+"@"+config.db.server+":5432/"+config.db.db);
var types = pgp.pg.types;
types.setTypeParser(1114, function(stringValue) {
	return stringValue;
});

this.one = function(script,parameter,callback_ok,callback_err){
	db.one(script,parameter).then(function(data){
		console.log("DB:OK;"+script+";"+JSON.stringify(parameter));
		callback_ok(data);
	}).catch(function(err){
		console.log("DB:FAIL;"+script+";"+JSON.stringify(parameter)+";"+JSON.stringify(err));
		callback_err(err);
	});
};

this.many = function(script,parameter,callback_ok,callback_err){
	db.many(script,parameter).then(function(data){
		console.log("DB:OK;"+script+";"+JSON.stringify(parameter));
		callback_ok(data);
	}).catch(function(err){
		console.log("DB:FAIL;"+script+";"+JSON.stringify(parameter)+";"+JSON.stringify(err));
		callback_err(err);
	});
};

this.any = function(script,parameter,callback_ok,callback_err){
	db.any(script,parameter).then(function(data){
		console.log("DB:OK;"+script+";"+JSON.stringify(parameter));
		callback_ok(data);
	}).catch(function(err){
		console.log("DB:FAIL;"+script+";"+JSON.stringify(parameter)+";"+JSON.stringify(err));
		callback_err(err);
	});
};

this.manyOrNone = function(script,parameter,callback_ok,callback_err){
	db.manyOrNone(script,parameter).then(function(data){
		console.log("DB:OK;"+script+";"+JSON.stringify(parameter));
		callback_ok(data);
	}).catch(function(err){
		console.log("DB:FAIL;"+script+";"+JSON.stringify(parameter)+";"+JSON.stringify(err));
		callback_err(err);
	});
};
this.oneOrNone = function(script,parameter,callback_ok,callback_err){
	db.oneOrNone(script,parameter).then(function(data){
		console.log("DB:OK;"+script+";"+JSON.stringify(parameter));
		callback_ok(data);
	}).catch(function(err){
		console.log("DB:FAIL;"+script+";"+JSON.stringify(parameter)+";"+JSON.stringify(err));
		callback_err(err);
	});
};
this.none=function(script,parameter,callback_ok,callback_err){
	db.none(script,parameter).then(function(){
		console.log("DB:OK;"+script+";"+JSON.stringify(parameter));
		callback_ok();
	}).catch(function(err){
		console.log("DB:FAIL;"+script+";"+JSON.stringify(parameter)+";"+JSON.stringify(err));
		callback_err(err);
	});
};
