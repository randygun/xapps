var tools_routes = require(__dirname+"/../tools/tools_routes");
var tools_api = require(__dirname+"/../tools/tools_api");
var tools_db = require(__dirname+"/../tools/tools_db");
var tools_all = require(__dirname+"/../tools/tools_all");
var config = require(__dirname+"/../config");
var lang = require(__dirname+"/../language");
var router = tools_routes.init();

router.hook("get","/",[],["version_code","os",'package_name'],function(req,res,role,next){
	var param = req.query;
	var print = {};
	tools_db.oneOrNone('SELECT * FROM table_version WHERE is_mandatory=TRUE AND os=${os} AND version_code>${version_code} AND package_name=${package_name} ORDER BY version_code DESC LIMIT 1',param,function(mandatory){
		print.mandatory = mandatory;
		tools_db.oneOrNone('SELECT * FROM table_version v LEFT JOIN (SELECT MAX(version_code) maxvcode FROM table_version WHERE is_mandatory=FALSE AND os=${os} AND version_code>${version_code} AND package_name=${package_name}) maxv ON maxv.maxvcode=v.version_code WHERE maxv.maxvcode IS NOT NULL ORDER BY v.version_code DESC LIMIT 1',param,function(nice){
			print.nice = nice;
			tools_api.ok200(res,{version:print});
		},function(err){
			tools_api.error422(req,res,lang.version.a);
		});
	},function(err){
		tools_api.error422(req,res,lang.version.a);
	});
});

module.exports = router.router;