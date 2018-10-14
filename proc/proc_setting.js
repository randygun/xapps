module.exports = this;
var instance = this;

var tools_db = require(__dirname+"/../tools/tools_db");
var config = require(__dirname+"/../config");

this.query = function(callback_success,callback_fail){
	var print = config.setting;
	print.fee_delivery = [];
	var maxi = 0;
	var i = -1;

	var complete = function(){
		i++;
		if(i>=maxi){
			callback_success(print);
			// tools_api.ok200(res,{settings:print});
			return;
		}
	};

	maxi ++;
	tools_db.many('SELECT * FROM table_fee_delivery ORDER BY distance DESC',undefined,function(fee_delivery){
		print.fee_delivery = fee_delivery;
		complete();
		return;
	},function(err){
		callback_fail(err);
		return;
		// tools_api.error422(req,res,lang.settings.a);
	});

	complete();
};