var tools_routes = require(__dirname+"/../tools/tools_routes");
var tools_api = require(__dirname+"/../tools/tools_api");
var tools_db = require(__dirname+"/../tools/tools_db");
var tools_all = require(__dirname+"/../tools/tools_all");
var tools_email = require(__dirname+"/../tools/tools_email");
var tools_app = require(__dirname+"/../proc/tools_app");
var config = require(__dirname+"/../config");
var lang = require(__dirname+"/../language");
var router = tools_routes.init();

router.hook('post','/',['buyer','seller','employee','admin'],[],function(req,res,role,next){
	tools_api.uploadFile(req,res,{});
});

module.exports = router.router;