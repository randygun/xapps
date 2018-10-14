var tools_routes = require(__dirname+"/../tools/tools_routes");
var tools_api = require(__dirname+"/../tools/tools_api");
var tools_db = require(__dirname+"/../tools/tools_db");
var tools_all = require(__dirname+"/../tools/tools_all");
var tools_email = require(__dirname+"/../tools/tools_email");
var config = require(__dirname+"/../config");
var lang = require(__dirname+"/../language");
var router = tools_routes.init();

var request = require('request');

router.hook('get','/center',['buyer','seller','employee'],[],function(req,res,role,next){
	tools_api.ok200(res,{contact_center:config.setting.company_address});
});

module.exports = router.router;