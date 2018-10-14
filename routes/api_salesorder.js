var tools_routes = require(__dirname+"/../tools/tools_routes");
var tools_api = require(__dirname+"/../tools/tools_api");
var tools_db = require(__dirname+"/../tools/tools_db");
var tools_all = require(__dirname+"/../tools/tools_all");
var tools_email = require(__dirname+"/../tools/tools_email");
var tools_app = require(__dirname+"/../proc/tools_app");
var config = require(__dirname+"/../config");
var lang = require(__dirname+"/../language");
var router = tools_routes.init();
var proc_trolley_confirm = require(__dirname+"/../proc/proc_trolley_confirm");

router.hook('get','/:id_order',['buyer','seller'],[],function(req,res,role,next){
	tools_db.one('SELECT * FROM table_trolley_confirm WHERE id=$1',req.params.id_order,function(confirm){
		var param = {};
		param.id_trolley_confirm = confirm.id;
		param.id_store = confirm.id_store;
		param.id_destination = confirm.id_destination;
		proc_trolley_confirm.query(req,res,param);
	},function(err){
		tools_api.error422(req,res,lang.order.a);
	});
});

module.exports = router.router;