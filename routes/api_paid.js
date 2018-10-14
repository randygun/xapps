var tools_routes = require(__dirname+"/../tools/tools_routes");
var tools_api = require(__dirname+"/../tools/tools_api");
var tools_db = require(__dirname+"/../tools/tools_db");
var tools_all = require(__dirname+"/../tools/tools_all");
var tools_email = require(__dirname+"/../tools/tools_email");
var config = require(__dirname+"/../config");
var lang = require(__dirname+"/../language");
var router = tools_routes.init();
var proc_printing = require(__dirname+'/../proc/proc_printing');

router.hook('get','/pdf/:date_start/:date_end',['seller'],[],function(req,res,role,next){
	var param = {
		id_user:req.token_access.id,
		date_start: req.params.date_start+" 00:00:00",
		date_end: req.params.date_end+" 00:00:00"
	};
	tools_db.one('INSERT INTO table_mutasi (id_requestor,date_start,date_end) VALUES (${id_user},${date_start},${date_end}) RETURNING id',param,function(mutasi){
		proc_printing.pdfMutasi(mutasi.id,param.id_user,param.date_start,param.date_end,function(file){
			tools_api.ok200(res,{
				mutasi_pdf:file
			});
		});
	},function(err){
		tools_api.error422(req,res,lang.generic.a);
	});
});

router.hook('get','/:date_start/:date_end',['seller'],[],function(req,res,role,next){
	var param = {
		id_user:req.token_access.id,
		date_start: req.params.date_start+" 00:00:00",
		date_end: req.params.date_end+" 00:00:00"
	};
	tools_api.paginationSupport(req,res,'\n\
			SELECT cf.*,cf.fee_delivery+counted.counted AS price_total,usr.name AS name_seller,cf.recipient_name AS name_buyer,tp.rating,tp.remark AS remark_review,tp.is_refunded,COALESCE(tp.commission,0) AS commission \n\
			FROM table_user usr \n\
			LEFT JOIN table_trolley_confirm cf ON cf.id_store=usr.id_store \n\
			LEFT JOIN table_trolley_confirm_agree cfa ON cfa.id_confirm=cf.id \n\
			LEFT JOIN table_trolley_paid tp ON tp.id_agree=cfa.id \n\
			LEFT JOIN (\n\
				SELECT SUM(prod.price*deta.qty) counted, det.id_trolley_confirm \n\
				FROM table_trolley_confirm_detail det \n\
				LEFT JOIN table_trolley_confirm_agree_detail deta ON deta.id_confirm_detail=det.id \n\
				LEFT JOIN table_product prod ON prod.id=det.id_product \n\
				WHERE deta.id IS NOT NULL \n\
				GROUP BY det.id_trolley_confirm) counted ON counted.id_trolley_confirm=cf.id\n\
			WHERE tp.is_admin_paid=TRUE AND tp.is_sent=TRUE AND tp.is_close=TRUE AND usr.id='+param.id_user+' AND tp.id IS NOT NULL \n\
			AND tp.time_close>=\''+param.date_start+'\' AND tp.time_close<(\''+param.date_end+'\'::timestamp without time zone + INTERVAL \'1 day\')\n\
			ORDER BY tp.id DESC','order_paid');
});

router.hook('delete','/',['seller'],['id_order'],function(req,res,role,next){
	var param = req.query;
	tools_db.one('SELECT id FROM table_trolley_confirm_agree WHERE id_confirm=${id_order}',param,function(agree){
		param.id_agree = agree.id;
		tools_db.one('UPDATE table_trolley_paid SET is_hide_seller=TRUE WHERE id_agree=${id_agree} RETURNING id',param,function(data){
			tools_api.success200(res);
		},function(err){
			tools_api.error422(req,res,lang.generic.b);
		});
	},function(err){
		tools_api.error422(req,res,lang.generic.b);
	});
});

router.hook('get','/',['seller'],[],function(req,res,role,next){
	var param = {
		id_user:req.token_access.id
	};
	tools_api.paginationSupport(req,res,'\n\
			SELECT cf.*,cf.fee_delivery+counted.counted AS price_total,usr.name AS name_seller,cf.recipient_name AS name_buyer,tp.rating,tp.remark AS remark_review,tp.is_refunded,COALESCE(tp.commission,0) AS commission \n\
			FROM table_user usr \n\
			LEFT JOIN table_trolley_confirm cf ON cf.id_store=usr.id_store \n\
			LEFT JOIN table_trolley_confirm_agree cfa ON cfa.id_confirm=cf.id \n\
			LEFT JOIN table_trolley_paid tp ON tp.id_agree=cfa.id \n\
			LEFT JOIN (\n\
				SELECT SUM(prod.price*deta.qty) counted, det.id_trolley_confirm \n\
				FROM table_trolley_confirm_detail det \n\
				LEFT JOIN table_trolley_confirm_agree_detail deta ON deta.id_confirm_detail=det.id \n\
				LEFT JOIN table_product prod ON prod.id=det.id_product \n\
				WHERE deta.id IS NOT NULL \n\
				GROUP BY det.id_trolley_confirm) counted ON counted.id_trolley_confirm=cf.id\n\
			WHERE tp.is_admin_paid=TRUE AND tp.is_sent=TRUE AND tp.is_close=TRUE AND usr.id='+param.id_user+' AND tp.id IS NOT NULL AND tp.is_hide_seller=FALSE \n\
			ORDER BY tp.id DESC','order_paid');
});

router.hook('get','/not',['seller'],[],function(req,res,role,next){
	var param = {
		id_user:req.token_access.id
	};
	tools_api.paginationSupport(req,res,'\n\
			SELECT cf.*,cf.fee_delivery+counted.counted AS price_total,usr.name AS name_seller,cf.recipient_name AS name_buyer,tp.rating,tp.remark AS remark_review,tp.is_refunded,COALESCE(tp.commission,0) AS commission \n\
			FROM table_user usr \n\
			LEFT JOIN table_trolley_confirm cf ON cf.id_store=usr.id_store \n\
			LEFT JOIN table_trolley_confirm_agree cfa ON cfa.id_confirm=cf.id \n\
			LEFT JOIN table_trolley_paid tp ON tp.id_agree=cfa.id \n\
			LEFT JOIN (\n\
				SELECT SUM(prod.price*deta.qty) counted, det.id_trolley_confirm \n\
				FROM table_trolley_confirm_detail det \n\
				LEFT JOIN table_trolley_confirm_agree_detail deta ON deta.id_confirm_detail=det.id \n\
				LEFT JOIN table_product prod ON prod.id=det.id_product \n\
				WHERE deta.id IS NOT NULL \n\
				GROUP BY det.id_trolley_confirm) counted ON counted.id_trolley_confirm=cf.id\n\
			WHERE tp.is_admin_paid=FALSE AND tp.is_sent=TRUE AND tp.is_close=TRUE AND usr.id='+param.id_user+' AND tp.id IS NOT NULL \n\
			ORDER BY tp.id DESC','order_notpaid');
});

module.exports = router.router;