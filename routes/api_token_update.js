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

router.hook("post","/",[],['token_fcm'],function(req,res,role,next){
	var param = req.body;
	param.id_user = req.token_access.id;
	tools_db.one('SELECT id_device FROM table_user WHERE id=${id_user}',param,function(user){
		if(typeof user.id_device ==='undefined' || user.id_device===null){
			tools_db.one('INSERT INTO table_device (token_fcm) VALUES (${token_fcm}) RETURNING id',param,function(device){
				param.id_device = device.id;
				tools_db.one('UPDATE table_user SET id_device=${id_device} WHERE id=${id_user} RETURNING id',param,function(user){
					tools_api.success200(res);
				},function(err){
					tools_api.error422(req,res,lang.token.b);
				});
			},function(err){
				tools_api.error422(req,res,lang.token.b);
			});
		}else{
			param.id_device = user.id_device;
			tools_db.one('UPDATE table_device SET token_fcm=${token_fcm} WHERE id=${id_device} RETURNING id',param,function(device){
				tools_api.success200(res);
			},function(err){
				tools_api.error422(req,res,lang.token.b);
			});
		}
	},function(err){
		tools_api.error422(req,res,lang.token.b);
	});
	
});

module.exports = router.router;