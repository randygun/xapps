var express = require('express');
var router = express.Router();
var tools_db = require(__dirname+'/../tools/tools_db');
var tools_api = require(__dirname+'/../tools/tools_api');
var tools_cms = require(__dirname+'/../tools/tools_cms');
var tools_all = require(__dirname+'/../tools/tools_all');
var tools_routes = require(__dirname+'/../tools/tools_routes');

var router = tools_routes.init();

/* GET home page. */
router.hook('get','/',['admin'],['id'],function(req,res,role,next){
	console.log("URL "+req.originalUrl);
	var param = req.query;

	var iteration = 0;
	var query = 2;

	var pool = function(){
		iteration++;
		if(iteration>=query){
			res.render('cms_order_report', {param_jade: tools_cms.param_jade(req), title: 'Order Report', param:param });
		}
	}

	param.complain = {
		description: ""
	};
	tools_db.one('SELECT * FROM table_complain WHERE id_confirm=${id} AND is_close=FALSE ORDER BY id DESC LIMIT 1 OFFSET 0',param,function(data){
		param.complain = data;
		pool();
	},function(err){
		param.complain.attachments = [];
		pool();
	});

	param.customer= {};
	param.store= {};
	tools_db.one("SELECT \n\
		confirm.id,\n\
		COALESCE(customer.name,'-') AS customer_name,\n\
		COALESCE(customer.address,'-') AS customer_address,\n\
		COALESCE(customer.phone,'-') AS customer_phone,\n\
		COALESCE(store.name,'-') AS store_name,\n\
		COALESCE(store.phone,'-') AS store_phone,\n\
		COALESCE(store.address,'-') AS store_address,\n\
		COALESCE(confirm.recipient_remark,'-') AS customer_remark,\n\
		COALESCE(paid.rating::text,'-') AS store_review,\n\
		COALESCE(paid.remark,'-') AS store_remark,\n\
		COALESCE(confirm.generated_number,'-') AS generated_number,\n\
		agree.id AS id_agree,\n\
		confirm.fee_delivery,\n\
		to_char(confirm.time_create,'YYYY-MM-DD HH24:MI:SS') AS time_create,\n\
		paid.commission\n\
		FROM table_trolley_confirm confirm \n\
		LEFT JOIN table_trolley_confirm_agree agree ON agree.id_confirm=confirm.id \n\
		LEFT JOIN table_trolley_paid paid ON paid.id_agree=agree.id \n\
		LEFT JOIN table_user customer ON customer.id=confirm.id_customer \n\
		LEFT JOIN table_store store ON store.id=confirm.id_store \n\
		WHERE confirm.id=${id}",param,function(data){
		param.customer = {
			name: data.customer_name,
			address: data.customer_address,
			phone: data.customer_phone,
			remark: data.customer_remark
		};
		param.store = {
			name: data.store_name,
			address: data.store_address,
			phone: data.store_phone,
			review: data.store_review,
			remark: data.store_remark
		};
		param.fee_delivery = data.fee_delivery;
		param.id_agree = data.id_agree;
		param.time_create = data.time_create;
		param.generated_number = data.generated_number;
		if(data.commission==null) param.commission = 0;
		else param.commission = data.commission;
		param.details = [];
		tools_db.manyOrNone('\n\
			SELECT product.*,\n\
			detail.qty, \n\
			COALESCE(agreedetail.qty,0) AS qty_agree \n\
			FROM table_trolley_confirm_detail detail \n\
			LEFT JOIN table_product product ON product.id=detail.id_product \n\
			LEFT JOIN table_trolley_confirm_agree_detail agreedetail ON agreedetail.id_confirm_detail=detail.id\n\
			WHERE id_trolley_confirm=${id}',param,function(details){
			param.details = details;
			pool();
		},function(err){
			res.render('cms_order_report', {param_jade: tools_cms.param_jade(req), title: 'Order Report', param:param });
		});
	},function(err){
		res.render('cms_order_report', {param_jade: tools_cms.param_jade(req), title: 'Order Report', param:param });
	});
});

module.exports = router.router;
