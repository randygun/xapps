var tools_routes = require(__dirname+"/../tools/tools_routes");
var tools_api = require(__dirname+"/../tools/tools_api");
var tools_db = require(__dirname+"/../tools/tools_db");
var tools_all = require(__dirname+"/../tools/tools_all");
var tools_email = require(__dirname+"/../tools/tools_email");
var config = require(__dirname+"/../config");
var lang = require(__dirname+"/../language");
var router = tools_routes.init();

router.hook('get','/paid',['seller'],[],function(req,res,role,next){
	var param = {id_user:req.token_access.id};
	tools_api.paginationSupport('\n\
		SELECT tc.* \n\
		FROM table_user usr \n\
		LEFT JOIN table_trolley_confirm tc ON tc.id_store=usr.id_store\n\
		LEFT JOIN table_trolley_confirm_agree tca ON tca.id_confirm=tc.id','payment_paid');
});

router.hook('get','/unpaid',['seller'],[],function(req,res,role,next){
	var param = {id_user:req.token_access.id};
});

module.exports = router.router;