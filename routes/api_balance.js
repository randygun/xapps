var tools_routes = require(__dirname+"/../tools/tools_routes");
var tools_api = require(__dirname+"/../tools/tools_api");
var tools_db = require(__dirname+"/../tools/tools_db");
var tools_all = require(__dirname+"/../tools/tools_all");
var tools_email = require(__dirname+"/../tools/tools_email");
var config = require(__dirname+"/../config");
var lang = require(__dirname+"/../language");
var router = tools_routes.init();

router.hook('put','/topup',['buyer'],['amount','pin'],function(req,res,role,next){
	var param = req.query;
	if(parseInt(param.amount)>parseInt(config.setting.money_max_topup)){
		tools_api.error422(req,res,lang.balance.b);
		return;
	}
	console.log('MAX TOPUP: '+config.setting.money_max_topup+". Amount "+param.amount);
	param.id_user = req.token_access.id;
	tools_db.one('SELECT pin AS pin_db,MD5(${pin}) AS pin_input FROM table_user WHERE id=${id_user}',param,function(user){
		if(user.pin_input===user.pin_db){
			tools_db.one('INSERT INTO table_topup (id_user,amount) VALUES (${id_user},${amount}) RETURNING *',param,function(topup){
				tools_api.ok200(res,{topup:topup});
			},function(err){
				tools_api.error422(req,res,lang.balance.a);
			});
		}else{
			tools_api.error422(req,res,lang.auth.a);
		}
	},function(err){
		tools_api.error422(req,res,lang.balance.a);
	});
});

router.hook('get','/history',['buyer'],[],function(req,res,role,next){
	tools_api.paginationSupport(req,res,'\n\
			SELECT * FROM table_balance_history WHERE id_user='+req.token_access.id+' ORDER BY id DESC','balance_history');
});

router.hook('delete','/pending',['buyer'],['generated_number'],function(req,res,role,next){
	var param = req.query;
	tools_db.one('UPDATE table_topup SET is_complete=TRUE, time_complete=NOW() WHERE generated_number=${generated_number} AND is_complete=FALSE RETURNING id',param,function(data){
		tools_api.success200(res);
	},function(err){
		tools_api.error422(req,res,lang.pending.a);
	});
});

router.hook('get','/pending',['buyer'],[],function(req,res,role,next){
	var param = {id_user:req.token_access.id};
	tools_db.manyOrNone('SELECT * FROM table_topup WHERE is_complete=FALSE AND id_user=${id_user} ORDER BY id DESC',param,function(pendings){
		tools_api.ok200(res,{pendings:pendings});
	},function(err){
		tools_api.error422(req,res,lang.pending.a);
	});
});

module.exports = router.router;