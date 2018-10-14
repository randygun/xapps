module.exports = this;
var instance = this;
var config = require(__dirname+"/../config");
var tools_db = require(__dirname+"/../tools/tools_db");

this.updateBahasa = function(id_user,newvalue,callback_success,callback_fail){
	var param = {id_user:id_user,id_language:config.dynamic.language[newvalue]};
	tools_db.one('UPDATE table_user SET id_language=${id_language} WHERE id=${id_user} RETURNING id_language',param,function(user){
		callback_success(config.dynamic.language[user.id_language]);
	},function(err){
		callback_fail();
	});
};