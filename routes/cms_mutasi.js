var express = require('express');
var router = express.Router();
var tools_cms = require(__dirname+'/../tools/tools_cms');
var tools_db = require(__dirname+'/../tools/tools_db');
var config = require(__dirname+'/../config');

/* GET home page. */
router.get('/', function(req, res, next) {
	var param_jade = tools_cms.param_jade(req);
	var param = req.query;
	tools_db.many('\n\
		SELECT cf.*,to_char(tp.time_close,\'DD/MM/YYYY HH24:MI:SS\') AS time_close, to_char(cf.time_create,\'DD/MM/YYYY HH24:MI:SS\') AS time_create,cf.fee_delivery+counted.counted AS price_total,usr.name AS name_seller,cf.recipient_name AS name_recipient,tp.rating,tp.remark AS remark_review,tp.is_refunded,COALESCE(tp.commission,0) AS commission, customer.name AS name_customer \n\
			FROM table_user usr \n\
			LEFT JOIN table_trolley_confirm cf ON cf.id_store=usr.id_store \n\
			LEFT JOIN table_user customer ON customer.id=cf.id_customer \n\
			LEFT JOIN table_trolley_confirm_agree cfa ON cfa.id_confirm=cf.id \n\
			LEFT JOIN table_trolley_paid tp ON tp.id_agree=cfa.id \n\
			LEFT JOIN (\n\
				SELECT SUM(prod.price*deta.qty) counted, det.id_trolley_confirm \n\
				FROM table_trolley_confirm_detail det \n\
				LEFT JOIN table_trolley_confirm_agree_detail deta ON deta.id_confirm_detail=det.id \n\
				LEFT JOIN table_product prod ON prod.id=det.id_product \n\
				WHERE deta.id IS NOT NULL \n\
				GROUP BY det.id_trolley_confirm) counted ON counted.id_trolley_confirm=cf.id\n\
			WHERE tp.is_admin_paid=TRUE AND tp.is_sent=TRUE AND tp.is_close=TRUE AND usr.id=${id_user} AND tp.id IS NOT NULL AND tp.is_hide_seller=FALSE \n\
			AND tp.time_close>=${date_start} AND tp.time_close<(${date_end}::timestamp without time zone + INTERVAL \'1 day\')\n\
			ORDER BY tp.id DESC',param,function(orders){
			res.render('cms_mutasi', { param_jade: param_jade, title: 'Mutasi', support_phone: config.setting.support_phone,orders:orders, param:param});
	},function(err){
		res.render('cms_mutasi', { param_jade: param_jade, title: 'Mutasi', orders: [], param:param});
	});
	
});

module.exports = router;
