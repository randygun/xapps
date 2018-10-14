var tools_routes = require(__dirname+"/../tools/tools_routes");
var tools_api = require(__dirname+"/../tools/tools_api");
var tools_db = require(__dirname+"/../tools/tools_db");
var tools_all = require(__dirname+"/../tools/tools_all");
var tools_email = require(__dirname+"/../tools/tools_email");
var config = require(__dirname+"/../config");
var lang = require(__dirname+"/../language");
var router = tools_routes.init();

var proc_setting = require(__dirname+"/../proc/proc_setting");

router.hook('get','/',['buyer'],[],function(req,res,role,next){
	proc_setting.query(function(settings){
		tools_api.ok200(res,{settings:settings});
	},function(err){
		tools_api.error422(req,res,lang.settings.a);
	});	
});

module.exports = router.router;