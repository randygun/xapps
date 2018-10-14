var tools_routes = require(__dirname+"/../tools/tools_routes");
var tools_api = require(__dirname+"/../tools/tools_api");
var tools_db = require(__dirname+"/../tools/tools_db");
var tools_all = require(__dirname+"/../tools/tools_all");
var config = require(__dirname+"/../config");
var lang = require(__dirname+"/../language");
var router = tools_routes.init();

router.hook('post','/',['seller','buyer'],['name','owner','number','amount','pin'],function(req,res,role,next){
	var param = req.body;
	param.id_user = req.token_access.id;
	tools_db.one('UPDATE table_user SET saldo=saldo-${amount} WHERE id=${id_user} AND (saldo-${amount})>=0 AND pin=MD5(${pin}) RETURNING id,saldo',param,function(user){
		tools_db.one('INSERT INTO table_cashit (name,owner,number,amount,id_user) VALUES (${name},${owner},${number},${amount},${id_user}) RETURNING id',param,function(cashit){
			var balance_current = parseInt(user.saldo)+parseInt(param.amount);
			var balance_after = user.saldo;
			var parambalancehistory = {
				remark_id:'Cairkan Dana',
				remark_en:'Cash It',
				remark_zh:'Cash It',
				id_user:param.id_user,
				is_plus:false,
				amount:param.amount,
				balance_current:balance_current,
				balance_after:balance_after,
				order:'-'
			};
			tools_db.none('INSERT INTO table_balance_history (remark_id,remark_en,remark_zh,id_user,is_plus,amount,balance_current,balance_after,order_number) VALUES (${remark_id},${remark_en},${remark_zh},${id_user},${is_plus},${amount},${balance_current},${balance_after},${order})',parambalancehistory,function(){},function(err){});
			tools_api.success200(res);
		},function(err){
			tools_api.error422(req,res,lang.cashit.b);
		});
	},function(err){
		tools_api.error422(req,res,lang.cashit.a);
	});
});

module.exports = router.router;
