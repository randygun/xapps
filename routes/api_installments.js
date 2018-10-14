var tools_routes = require(__dirname+"/../tools/tools_routes");
var tools_api = require(__dirname+"/../tools/tools_api");
var tools_db = require(__dirname+"/../tools/tools_db");
var tools_all = require(__dirname+"/../tools/tools_all");
var tools_email = require(__dirname+"/../tools/tools_email");
var config = require(__dirname+"/../config");
var lang = require(__dirname+"/../language");
var proc_login = require(__dirname+'/../proc/proc_login');
var proc_forget = require(__dirname+'/../proc/proc_forget');
var router = tools_routes.init();

var proc = require(__dirname+'/../proc/proc_login');

router.hook("get","/",['buyer'],[],function(req,res,role,next){
	tools_db.manyOrNone('SELECT code AS bank, name AS bank_string, terms FROM table_installment WHERE terms!=\'[]\' AND is_active=TRUE ORDER BY terms ASC',undefined,function(installments){
		tools_api.ok200(res,{installments:installments});
	},function(err){
		tools_api.error422(req,res,lang.generic.a);
	});
	return;
	var installments = [];
	try{
		var terms = JSON.parse("["+config.setting.installment_mandiri+"]");
		if(terms.length>0)installments.push({bank:"mandiri",bank_string:"Mandiri",terms:terms});
	}catch(err){

	}
	try{
		var terms = JSON.parse("["+config.setting.installment_bni+"]");
		if(terms.length>0)installments.push({bank:"bni",bank_string:"BNI",terms:terms});
	}catch(err){

	}
	try{
		var terms = JSON.parse("["+config.setting.installment_cimb+"]");
		if(terms.length>0)installments.push({bank:"cimb",bank_string:"CIMB",terms:terms});
	}catch(err){

	}
	try{
		var terms = JSON.parse("["+config.setting.installment_bca+"]");
		if(terms.length>0)installments.push({bank:"bca",bank_string:"BCA",terms:terms});
	}catch(err){

	}
	try{
		var terms = JSON.parse("["+config.setting.installment_offline+"]");
		if(terms.length>0)installments.push({bank:"offline",bank_string:"Offline",terms:terms});
	}catch(err){

	}
	tools_api.ok200(res,{installments:installments});
});

module.exports = router.router;