var express = require('express');
var router = express.Router();
var tools_cms = require(__dirname+'/../tools/tools_cms');
var tools_db = require(__dirname+'/../tools/tools_db');
var config = require(__dirname+'/../config');

/* GET home page. */
router.get('/', function(req, res, next) {
	var param_jade = tools_cms.param_jade(req);
	console.log(JSON.stringify(param_jade));
	var param = req.query;
	tools_db.many('\n\
		SELECT \n\
		confirm.distance,to_char(confirm.time_create,\'DD/MM/YYYY\') AS time_create_date,to_char(confirm.time_create,\'HH24:MI:SS\') AS time_create_hour,confirm.generated_number, \n\
		store.name AS store_name,store.address AS store_address, store.phone AS store_phone, \n\
		confirm.recipient_name, confirm.recipient_phone,confirm.recipient_remark, \n\
		destination.name AS destination_name, confirm.destination_remark,\n\
		product.name AS product_name,product.description AS product_description,product.price AS product_price,\n\
		COALESCE(agreedetail.qty,detail.qty) AS qty,confirm.fee_delivery,usr.name AS customer_name, COALESCE(usr.phone,\'-\') AS customer_phone,\n\
		COALESCE(to_char(agree.time_deliver_plan,\'DD/MM/YYYY HH24:MI:SS\'),\'-\') AS time_deliver_plan\n\
		FROM table_trolley_confirm confirm \n\
		LEFT JOIN table_trolley_confirm_agree agree ON agree.id_confirm=confirm.id\n\
		LEFT JOIN table_user usr ON usr.id=confirm.id_customer\n\
		LEFT JOIN table_store store ON store.id=confirm.id_store\n\
		LEFT JOIN table_location_gps destination ON destination.id=confirm.id_destination\n\
		LEFT JOIN table_trolley_confirm_detail detail ON detail.id_trolley_confirm=confirm.id\n\
		LEFT JOIN table_trolley_confirm_agree_detail agreedetail ON agreedetail.id_confirm_detail=detail.id\n\
		LEFT JOIN table_product product ON product.id=detail.id_product\n\
		WHERE confirm.id=${id}',param,function(trolley_confirm){
			var watermark = "";
			if(typeof param.watermark!=='undefined' && param.watermark!==''){
				watermark = param.watermark;
			}
			res.render('cms_salesorder', { param_jade: param_jade, title: 'Sales Order', param:trolley_confirm, watermark: watermark, support_phone: config.setting.support_phone});
	},function(err){
		res.render('cms_salesorder', { param_jade: param_jade, title: 'Sales Order', param: []});
	});
	
});

module.exports = router;
