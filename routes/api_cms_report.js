var tools_routes = require(__dirname+"/../tools/tools_routes");
var tools_cms = require(__dirname+"/../tools/tools_cms");
var tools_api = require(__dirname+"/../tools/tools_api");
var tools_db = require(__dirname+"/../tools/tools_db");
var tools_all = require(__dirname+"/../tools/tools_all");
var tools_xlsx = require(__dirname+"/../tools/tools_xlsx");
var config = require(__dirname+"/../config");
var lang = require(__dirname+"/../language");
var router = tools_routes.init();

router.hook('post','/category/:date_from/:date_to',['admin'],[],function(req,res,role,next){
	var param = req.params;
	param.date_from += " 00:00:00";
	param.date_to += " 23:59:59";
	tools_xlsx.exportFromDB('\n\
		SELECT\n\
			cat.id AS "ID",cat.name AS "Name",cat.description AS "Description",COALESCE(raw.omzet,0) AS "Omzet"\n\
			FROM template_product_category cat\n\
			LEFT JOIN (\n\
				SELECT\n\
				SUM(tcad.qty*tp.price) AS omzet,tpc.id_template\n\
				FROM table_product_category tpc\n\
				LEFT JOIN table_product tp ON tp.id_category=tpc.id\n\
				LEFT JOIN table_trolley_confirm_detail tcd ON tcd.id_product=tp.id\n\
				LEFT JOIN table_trolley_confirm tc ON tc.id=tcd.id_trolley_confirm\n\
				LEFT JOIN table_trolley_confirm_agree_detail tcad ON tcad.id_confirm_detail=tcd.id\n\
				LEFT JOIN table_trolley_confirm_agree tca ON tca.id_confirm=tc.id\n\
				LEFT JOIN table_trolley_paid tpp ON tpp.id_agree=tca.id\n\
				WHERE \n\
				tpp.id IS NOT NULL AND tcad.id IS NOT NULL AND\n\
				tc.time_create>=${date_from} AND tc.time_create<=${date_to}\n\
				GROUP BY tpc.id_template) raw ON raw.id_template=cat.id\n\
			ORDER BY cat.id ASC\n\
		',param,'ReportCategory',function(success){
		tools_api.ok200(res,{report:tools_cms.param_jade(req).getFullPath()+success});
	},function(err){
		tools_api.error422(req,res,lang.generic.a);
	});	
});

router.hook('get','/category/:date_from/:date_to',['admin'],[],function(req,res,role,next){
	var param = req.params;
	param.date_from += " 00:00:00";
	param.date_to += " 23:59:59";
	tools_cms.tableSupport(req,res,"\n\
		SELECT raw.* FROM (\n\
			SELECT\n\
			cat.id,cat.name,cat.description,COALESCE(raw.omzet,0) AS omzet\n\
			FROM template_product_category cat\n\
			LEFT JOIN (\n\
				SELECT\n\
				SUM(tcad.qty*tp.price) AS omzet,tpc.id_template\n\
				FROM table_product_category tpc\n\
				LEFT JOIN table_product tp ON tp.id_category=tpc.id\n\
				LEFT JOIN table_trolley_confirm_detail tcd ON tcd.id_product=tp.id\n\
				LEFT JOIN table_trolley_confirm tc ON tc.id=tcd.id_trolley_confirm\n\
				LEFT JOIN table_trolley_confirm_agree_detail tcad ON tcad.id_confirm_detail=tcd.id\n\
				LEFT JOIN table_trolley_confirm_agree tca ON tca.id_confirm=tc.id\n\
				LEFT JOIN table_trolley_paid tpp ON tpp.id_agree=tca.id\n\
				WHERE \n\
				tpp.id IS NOT NULL AND tcad.id IS NOT NULL AND\n\
				tc.time_create>='"+param.date_from+"' AND tc.time_create<='"+param.date_to+"'\n\
				GROUP BY tpc.id_template) raw ON raw.id_template=cat.id\n\
			ORDER BY cat.id ASC\n\
		) raw",
		["raw.name","raw.description"],
		"raw.id DESC",function(row){
			return [
				row.no,
				row.name,
				row.description,
				parseInt(row.omzet).formatMoney(0)
			]
		});
});

router.hook('post','/:date_from/:date_to',['admin'],[],function(req,res,role,next){
	var param = req.params;
	param.date_from += " 00:00:00";
	param.date_to += " 23:59:59";
	tools_xlsx.exportFromDB('\n\
		SELECT\n\
			confirm.id AS id,confirm.generated_number AS "Order Number",to_char(confirm.time_create,\'YYYY-MM-DD HH24:MI:SS\') AS "Time Create",COALESCE(to_char(confirm.time_close,\'YYYY-MM-DD HH24:MI:SS\'),COALESCE(to_char(paid.time_close,\'YYYY-MM-DD HH24:MI:SS\'),\'-\')) AS "Time Close",\n\
			store.name AS "Store Name",\n\
			usr.name AS "Customer Name",\n\
			COALESCE(agree.is_paid,FALSE) AS "Is Paid By Buyer",\n\
			agree.payment_type AS "Payment Type",\n\
			agree.installment_term AS "Installment Term",\n\
			COALESCE(paid.is_seller_paid,FALSE) AS "Is Paid By TM",\n\
			COALESCE(COALESCE(jum.jum+COALESCE(confirm.fee_delivery,0),0)*paid.commission/100::bigint,0) AS "Commission"\n\
			FROM table_trolley_confirm confirm\n\
			LEFT JOIN table_trolley_confirm_agree agree ON agree.id_confirm=confirm.id\n\
			LEFT JOIN table_trolley_paid paid ON paid.id_agree=agree.id\n\
			LEFT JOIN table_store store ON store.id=confirm.id_store\n\
			LEFT JOIN (SELECT SUM(product.price*agreedetail.qty) AS jum, confirm.id FROM table_trolley_confirm confirm LEFT JOIN table_trolley_confirm_detail confirmdetail ON confirmdetail.id_trolley_confirm=confirm.id LEFT JOIN public.table_trolley_confirm_agree_detail agreedetail ON agreedetail.id_confirm_detail=confirmdetail.id LEFT JOIN table_product product ON product.id=confirmdetail.id_product GROUP BY confirm.id) jum ON jum.id=confirm.id\n\
			LEFT JOIN table_user usr ON usr.id=confirm.id_customer\n\
			WHERE confirm.time_create>=${date_from} AND confirm.time_create<=${date_to}\n\
		',param,'Report',function(success){
		tools_api.ok200(res,{report:tools_cms.param_jade(req).getFullPath()+success});
	},function(err){
		tools_api.error422(req,res,lang.generic.a);
	});	
});

router.hook('get','/:date_from/:date_to',['admin'],[],function(req,res,role,next){
	var param = req.params;
	param.date_from += " 00:00:00";
	param.date_to += " 23:59:59";
	tools_cms.tableSupport(req,res,"\n\
		SELECT raw.* FROM (\n\
			SELECT\n\
			confirm.id,confirm.generated_number,to_char(confirm.time_create,\'YYYY-MM-DD HH24:MI:SS\') AS time_create,COALESCE(to_char(confirm.time_close,\'YYYY-MM-DD HH24:MI:SS\'),COALESCE(to_char(paid.time_close,\'YYYY-MM-DD HH24:MI:SS\'),\'-\')) AS time_close,\n\
			store.name AS name_store,\n\
			usr.name AS name_customer,\n\
			agree.installment_term,\n\
			COALESCE(agree.payment_type,'-') AS payment_type,\n\
			COALESCE(agree.is_paid,FALSE) AS is_paid_by_buyer,\n\
			COALESCE(paid.is_seller_paid,FALSE) AS is_paid_by_tm,\n\
			COALESCE(COALESCE(jum.jum+COALESCE(confirm.fee_delivery,0),0)*paid.commission/100::bigint,0) AS commission\n\
			FROM table_trolley_confirm confirm\n\
			LEFT JOIN table_trolley_confirm_agree agree ON agree.id_confirm=confirm.id\n\
			LEFT JOIN table_trolley_paid paid ON paid.id_agree=agree.id\n\
			LEFT JOIN table_store store ON store.id=confirm.id_store\n\
			LEFT JOIN (SELECT SUM(product.price*agreedetail.qty) AS jum, confirm.id FROM table_trolley_confirm confirm LEFT JOIN table_trolley_confirm_detail confirmdetail ON confirmdetail.id_trolley_confirm=confirm.id LEFT JOIN public.table_trolley_confirm_agree_detail agreedetail ON agreedetail.id_confirm_detail=confirmdetail.id LEFT JOIN table_product product ON product.id=confirmdetail.id_product GROUP BY confirm.id) jum ON jum.id=confirm.id\n\
			LEFT JOIN table_user usr ON usr.id=confirm.id_customer\n\
			WHERE confirm.time_create>='"+param.date_from+"' AND confirm.time_create<='"+param.date_to+"'\n\
		) raw",
		["raw.generated_number","raw.name_store","raw.name_customer","raw.payment_type"],
		"raw.id DESC",function(row){
			var payment_type = row.payment_type;
			if(row.installment_term!==null) payment_type+= "<br> Installment "+row.installment_term+" month";
			return [
				row.no,
				row.generated_number,
				row.time_create,
				row.name_store,
				row.name_customer,
				row.is_paid_by_buyer,
				payment_type,
				row.time_close,
				row.is_paid_by_tm,
				parseInt(row.commission).formatMoney(0)
			]
		});
});

module.exports = router.router;
