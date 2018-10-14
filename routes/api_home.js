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

router.hook("get","/ads",[],[],function(req,res,role,next){
	var param = {
		id_user: req.token_access.id
	}
	tools_db.manyOrNone("SELECT * FROM table_ads WHERE is_active=TRUE AND ads!=$1 ORDER BY id ASC","[]",function(ads){
		var count = {};
		var print = function(){
			tools_api.ok200(res,{home_ads:ads,setting:config.setting,count:count});
		}
		if(role==='buyer'){
			// tools_db.one('SELECT (SELECT COUNT(cf.id) FROM table_trolley_confirm cf LEFT JOIN table_trolley_confirm_agree cfa ON cfa.id_confirm=cf.id WHERE cfa.is_paid=FALSE AND cf.id_customer=${id_user} AND cf.is_delete=FALSE) AS cnt_cart, (SELECT count(id) FROM table_topup WHERE is_complete=FALSE AND id_user=${id_user}) AS cnt_balance',param,function(cnt){
			// 	count = {
			// 		cnt_cart:cnt.cnt_cart,
			// 		cnt_balance: cnt.cnt_balance
			// 	};
			// 	print();
			// },function(err){
			// 	tools_api.error422(req,res,lang.home_ads.a);
			// });
			tools_db.one('SELECT COUNT(cf.id) AS counted, (SELECT COUNT(cf.id) FROM table_trolley_confirm cf LEFT JOIN table_trolley_confirm_agree cfa ON cfa.id_confirm=cf.id WHERE cfa.is_paid=FALSE AND cf.id_customer=${id_user} AND cf.is_delete=FALSE) AS cnt_cart, (SELECT count(id) FROM table_topup WHERE is_complete=FALSE AND id_user=${id_user}) AS cnt_balance\n\
			FROM table_trolley_confirm cf\n\
			LEFT JOIN (SELECT * FROM table_user WHERE id_role='+config.dynamic.role.seller+') usr ON usr.id_store=cf.id_store\n\
			LEFT JOIN table_trolley_confirm_agree cfa ON cfa.id_confirm=cf.id \n\
			LEFT JOIN (\n\
				SELECT SUM(prod.price*deta.qty) counted, det.id_trolley_confirm \n\
				FROM table_trolley_confirm_detail det \n\
				LEFT JOIN table_trolley_confirm_agree_detail deta ON deta.id_confirm_detail=det.id \n\
				LEFT JOIN table_product prod ON prod.id=det.id_product \n\
				WHERE deta.id IS NOT NULL \n\
				GROUP BY det.id_trolley_confirm) counted ON counted.id_trolley_confirm=cf.id\n\
			WHERE cfa.is_paid=FALSE AND cf.id_customer=${id_user} AND cfa.id IS NOT NULL',param,function(data){
				count = {
					cnt_cart:data.cnt_cart,
					cnt_balance: data.cnt_balance
				};
				print();
				// tools_api.ok200(res,{count:data.counted,pending:{
				// 	cnt_balance: data.cnt_balance,
				// 	cnt_cart:data.cnt_cart
				// }});
			},function(err){
				tools_api.error422(req,res,lang.order.a);
			});
			return;
		}else if(role==='seller'){
			tools_db.one('\n\
				SELECT\n\
COALESCE(cnt.cnt_order,0) AS cnt_order,COALESCE(rating.rating,0) AS rating\n\
FROM table_user usr \n\
LEFT JOIN (SELECT COUNT(tc.id) AS cnt_order,tc.id_store \n\
	FROM table_user usr \n\
	LEFT JOIN table_trolley_confirm tc ON tc.id_store=usr.id_store \n\
	WHERE usr.id=${id_user} AND tc.is_agreed=FALSE AND tc.is_delete=FALSE GROUP BY tc.id_store) cnt ON cnt.id_store=usr.id_store\n\
LEFT JOIN (SELECT AVG(paid.rating)::bigint AS rating, confirm.id_store FROM table_trolley_confirm confirm LEFT JOIN table_trolley_confirm_agree agree ON agree.id_confirm=confirm.id LEFT JOIN table_trolley_paid paid ON paid.id_agree=agree.id WHERE paid.rating IS NOT NULL GROUP BY confirm.id_store) rating ON rating.id_store=usr.id_store\n\
WHERE usr.id=${id_user}',param,function(data){
				count = {
					cnt_order:data.cnt_order,
					rating:data.rating
				};
				print();
			},function(err){
				tools_api.error422(req,res,lang.home_ads.a);
			});
			return;
		}
		print();
	},function(err){
		tools_api.error422(req,res,lang.home_ads.a);
	});
});

module.exports = router.router;