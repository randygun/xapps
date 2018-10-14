var tools_routes = require(__dirname+"/../tools/tools_routes");
var tools_cms = require(__dirname+"/../tools/tools_cms");
var tools_api = require(__dirname+"/../tools/tools_api");
var tools_db = require(__dirname+"/../tools/tools_db");
var tools_all = require(__dirname+"/../tools/tools_all");
var tools_xlsx = require(__dirname+"/../tools/tools_xlsx");
var config = require(__dirname+"/../config");
var lang = require(__dirname+"/../language");
var router = tools_routes.init();

router.hook('get','/seller/unpaid/:date_from/:date_to',['admin'],[],function(req,res,role,next){
	console.log("LALALALLALALALALALALALAL");
	var param = req.params;
	param.date_from += " 00:00:00";
	param.date_to += " 23:59:59";
	tools_cms.tableSupport(req,res,"\n\
		SELECT raw.* FROM (\n\
			SELECT COALESCE(paid.commission,0) AS commission,confirm.id AS id_confirm,rekening.name_bank,rekening.name_owner,rekening.no_rekening,paid.is_seller_paid,COALESCE(cnt.cnt,0) AS cnt,COALESCE(cnt.jum+COALESCE(confirm.fee_delivery,0),0) AS jum,paid.id AS id,confirm.time_create,paid.time_close,COALESCE(destination.name,'-') AS customer_address, COALESCE(customer.name,'-') AS customer_name, COALESCE(customer.phone,'-') AS customer_phone, store.name AS store_name, store.address AS store_address, COALESCE(store.phone,'-') AS store_phone, confirm.generated_number \n\
			FROM table_trolley_confirm confirm LEFT JOIN table_location_gps destination ON destination.id=confirm.id_destination LEFT JOIN table_user customer ON customer.id=confirm.id_customer LEFT JOIN table_store store ON store.id=confirm.id_store LEFT JOIN table_trolley_confirm_agree agree ON agree.id_confirm=confirm.id LEFT JOIN (SELECT COUNT(CASE WHEN agreedetail.qty!=0 THEN 1 END) AS cnt,SUM(agreedetail.qty*product.price) AS jum,confirmdetail.id_trolley_confirm FROM table_trolley_confirm_detail confirmdetail LEFT JOIN table_product product ON product.id=confirmdetail.id_product LEFT JOIN table_trolley_confirm_agree_detail agreedetail ON agreedetail.id_confirm_detail=confirmdetail.id GROUP BY confirmdetail.id_trolley_confirm) cnt ON cnt.id_trolley_confirm=confirm.id LEFT JOIN table_trolley_paid paid ON paid.id_agree=agree.id LEFT JOIN (SELECT * FROM table_user WHERE id_role="+config.dynamic.role.seller+") seller ON seller.id_store=confirm.id_store LEFT JOIN table_rekening rekening ON rekening.id=seller.id_rekening \n\
			WHERE paid.is_close=TRUE AND paid.is_admin_paid=FALSE AND paid.is_sent=TRUE AND paid.time_create>='"+param.date_from+"' AND paid.time_create<='"+param.date_to+"'\n\
		) raw",
		['raw.generated_number',"raw.store_name","raw.store_address","raw.store_phone","raw.customer_name","raw.customer_address","raw.customer_phone"],
		"raw.id DESC",function(row){
			var action = "<center><a title='Go To Order Detail' href='#showReport' onclick='showReport("+row.id_confirm+");'><span class='glyphicon glyphicon-search'/></a>&nbsp;&nbsp;&nbsp;<a title='Process Seller Payment' href='#paySeller' onclick='paySeller("+row.id+");'><span class='glyphicon glyphicon-arrow-right'/></a>";
			return [
				row.generated_number,
				row.store_name+"<br>"+row.store_address+"<br>"+row.store_phone,
				row.customer_name+"<br>"+row.customer_address+"<br>"+row.customer_phone,
				row.name_bank+"<br>"+row.name_owner+"<br>"+row.no_rekening,
				row.time_create+"<br>"+row.time_close,
				parseInt(row.cnt).formatMoney(0),
				row.commission,
				parseInt(row.jum).formatMoney(0)+"<br><font color='darkred'>("+(parseInt(row.jum)*row.commission/100)+")</font><br><font color='darkgreen'>"+parseInt(parseInt(row.jum)-(parseInt(row.jum)*row.commission/100)).formatMoney(0)+"</font>",
				action
			]
		});
});

router.hook('get','/seller/:date_from/:date_to/export',['admin'],[],function(req,res,role,next){
	console.log("LALALALLALALALALALALALAL");
	var param = req.params;
	param.date_from += " 00:00:00";
	param.date_to += " 23:59:59";
	var sql = "\n\
		SELECT raw.* FROM (\n\
			SELECT \n\
			confirm.id AS \"ID ORDER\",\n\
			rekening.name_bank AS \"BANK NAME\",\n\
			rekening.name_owner AS \"BANK ACCOUNT OWNER\",\n\
			rekening.no_rekening AS \"BANK ACCOUNT NUMBER\",\n\
			paid.is_seller_paid AS \"IS SELLER PAID\",\n\
			COALESCE(cnt.cnt,0) AS \"PRODUCT COUNT\",\n\
			COALESCE(cnt.jum+COALESCE(confirm.fee_delivery,0),0) AS \"OMZET SALES\",\n\
			COALESCE(paid.commission,0) AS \"COMMISSION (%)\",\n\
			confirm.time_create AS \"ORDER CREATED\",\n\
			paid.time_close AS \"ORDER PAID\",\n\
			COALESCE(destination.name,'-') AS \"CUSTOMER ADDRESS\",\n\
			COALESCE(customer.name,'-') AS \"CUSTOMER NAME\",\n\
			COALESCE(customer.phone,'-') AS \"CUSTOMER PHONE\", \n\
			store.name AS \"STORE NAME\", \n\
			store.address AS \"STORE ADDRESS\", \n\
			COALESCE(store.phone,'-') AS \"STORE PHONE\", \n\
			confirm.generated_number AS \"ORDER NUMBER\" \n\
			FROM table_trolley_confirm confirm \n\
			LEFT JOIN table_location_gps destination ON destination.id=confirm.id_destination \n\
			LEFT JOIN table_user customer ON customer.id=confirm.id_customer \n\
			LEFT JOIN table_store store ON store.id=confirm.id_store \n\
			LEFT JOIN table_trolley_confirm_agree agree ON agree.id_confirm=confirm.id \n\
			LEFT JOIN (SELECT COUNT(CASE WHEN agreedetail.qty!=0 THEN 1 END) AS cnt,SUM(agreedetail.qty*product.price) AS jum,confirmdetail.id_trolley_confirm FROM table_trolley_confirm_detail confirmdetail LEFT JOIN table_product product ON product.id=confirmdetail.id_product LEFT JOIN table_trolley_confirm_agree_detail agreedetail ON agreedetail.id_confirm_detail=confirmdetail.id GROUP BY confirmdetail.id_trolley_confirm) cnt ON cnt.id_trolley_confirm=confirm.id \n\
			LEFT JOIN table_trolley_paid paid ON paid.id_agree=agree.id \n\
			LEFT JOIN (SELECT * FROM table_user WHERE id_role="+config.dynamic.role.seller+") seller ON seller.id_store=confirm.id_store \n\
			LEFT JOIN table_rekening rekening ON rekening.id=seller.id_rekening \n\
			WHERE paid.is_close=TRUE AND paid.is_sent=TRUE AND paid.time_create>='"+param.date_from+"' AND paid.time_create<='"+param.date_to+"'\n\
		) raw";
	tools_xlsx.exportFromDB(sql,param,'PaymentSellerReport',function(success){
		tools_api.ok200(res,{report:tools_cms.param_jade(req).getFullPath()+success});
	},function(err){
		tools_api.error422(req,res,lang.generic.a);
	});
});

router.hook('get','/seller/paid/:date_from/:date_to',['admin'],[],function(req,res,role,next){
	var param = req.params;
	param.date_from += " 00:00:00";
	param.date_to += " 23:59:59";
	tools_cms.tableSupport(req,res,"\n\
		SELECT raw.* FROM (\n\
			SELECT COALESCE(paid.commission,0) AS commission,COALESCE(rekening.name_bank,'-') AS name_bank,COALESCE(rekening.name_owner,'-') AS name_owner,COALESCE(rekening.no_rekening,'-') AS no_rekening,paid.is_seller_paid,COALESCE(cnt.cnt,0) AS cnt,COALESCE(cnt.jum+COALESCE(confirm.fee_delivery,0),0) AS jum,confirm.id,confirm.time_create,paid.time_close,COALESCE(destination.name,'-') AS customer_address, COALESCE(customer.name,'-') AS customer_name, COALESCE(customer.phone,'-') AS customer_phone, store.name AS store_name, store.address AS store_address, COALESCE(store.phone,'-') AS store_phone, confirm.generated_number \n\
			FROM table_trolley_confirm confirm \n\
			LEFT JOIN table_location_gps destination ON destination.id=confirm.id_destination \n\
			LEFT JOIN table_user customer ON customer.id=confirm.id_customer \n\
			LEFT JOIN table_store store ON store.id=confirm.id_store \n\
			LEFT JOIN table_trolley_confirm_agree agree ON agree.id_confirm=confirm.id \n\
			LEFT JOIN (\n\
				SELECT COUNT(CASE WHEN agreedetail.qty!=0 THEN 1 END) AS cnt,SUM(agreedetail.qty*product.price) AS jum,confirmdetail.id_trolley_confirm FROM table_trolley_confirm_detail confirmdetail LEFT JOIN table_product product ON product.id=confirmdetail.id_product \n\
				LEFT JOIN table_trolley_confirm_agree_detail agreedetail ON agreedetail.id_confirm_detail=confirmdetail.id \n\
				GROUP BY confirmdetail.id_trolley_confirm) cnt ON cnt.id_trolley_confirm=confirm.id \n\
			LEFT JOIN table_trolley_paid paid ON paid.id_agree=agree.id \n\
			LEFT JOIN (SELECT * FROM table_user WHERE id_role="+config.dynamic.role.seller+") seller ON seller.id_store=confirm.id_store \n\
			LEFT JOIN table_rekening rekening ON rekening.id=seller.id_rekening \n\
			WHERE paid.is_close=TRUE AND paid.is_admin_paid=TRUE AND paid.is_sent=TRUE AND paid.time_close>='"+param.date_from+"' AND paid.time_close<='"+param.date_to+"'\n\
		) raw",
		['raw.generated_number',"raw.store_name","raw.store_address","raw.store_phone","raw.customer_name","raw.customer_address","raw.customer_phone"],
		"raw.id DESC",function(row){
			var action = "<center><a title='Go To Order Detail' href='#showReport' onclick='showReport("+row.id+");'><span class='glyphicon glyphicon-search'/></a>&nbsp;&nbsp;&nbsp;";
			if(row.is_seller_paid) action += "<a href='#paid' title='Seller Paid'><span class='glyphicon glyphicon-ok-circle' style='color: green;'/></a></center>";
			else action += "<a href='#notPaid' title='Seller Not Paid'><span class='glyphicon glyphicon-remove-circle' style='color: red;'/></a></center>";
			return [
				row.generated_number,
				row.store_name+"<br>"+row.store_address+"<br>"+row.store_phone,
				row.customer_name+"<br>"+row.customer_address+"<br>"+row.customer_phone,
				row.name_bank+"<br>"+row.name_owner+"<br>"+row.no_rekening,
				row.time_create+"<br>"+row.time_close,
				parseInt(row.cnt).formatMoney(0),
				row.commission,
				parseInt(row.jum).formatMoney(0)+"<br><font color='darkred'>("+(parseInt(row.jum)*row.commission/100)+")</font><br><font color='darkgreen'>"+parseInt(parseInt(row.jum)-(parseInt(row.jum)*row.commission/100)).formatMoney(0)+"</font>",
				action
			]
		});
});

router.hook('get','/buyer/unpaid/:date_from/:date_to',['admin'],[],function(req,res,role,next){
	var param = req.params;
	param.date_from += " 00:00:00";
	param.date_to += " 23:59:59";
	tools_cms.tableSupport(req,res,"\n\
		SELECT raw.* FROM (\n\
			SELECT cashit.name AS rekening_name,cashit.owner AS rekening_owner,cashit.number AS rekening_number,(NOW()::date-cashit.time_create::date) AS sla,cashit.amount,cashit.time_create,cashit.id,COALESCE(customer.name,'-') AS customer_name,COALESCE(customer.address,'-') AS customer_address, COALESCE(customer.phone,'-') AS customer_phone \n\
			FROM table_cashit cashit \n\
			LEFT JOIN table_user customer ON customer.id=cashit.id_user \n\
			WHERE cashit.is_complete=FALSE AND cashit.is_approve=FALSE AND cashit.time_create>='"+param.date_from+"' AND cashit.time_create<='"+param.date_to+"'\n\
		) raw",
		["raw.customer_name","raw.customer_address","raw.customer_phone"],
		"raw.id ASC",function(row){
			var action = "<center><a title='Process Buyer Payment' href='#payBuyer' onclick='payBuyer("+row.id+");'><span class='glyphicon glyphicon-arrow-right'/></a>";
			return [
				row.id,
				row.customer_name+"<br>"+row.customer_address+"<br>"+row.customer_phone,
				row.rekening_name+"<br>"+row.rekening_owner+"<br>"+row.rekening_number,
				"<center>"+row.time_create+"<br>"+parseInt(row.sla).formatMoney(0)+" days</center>",
				parseInt(row.amount).formatMoney(0),
				action
			]
		});
});

router.hook('get','/buyer/:date_from/:date_to/export',['admin'],[],function(req,res,role,next){
	var param = req.params;
	param.date_from += " 00:00:00";
	param.date_to += " 23:59:59";
	var sql = "\n\
		SELECT raw.* FROM (\n\
			SELECT cashit.name AS \"BANK NAME\",cashit.owner AS \"BANK ACCOUNT OWNER\",\n\
			cashit.number AS \"BANK ACCOUNT NUMBER\",\n\
			(NOW()::date-cashit.time_create::date) AS \"SLA\",\n\
			cashit.amount AS \"AMOUNT\",\n\
			cashit.time_create AS \"TIME REQUEST\",cashit.id AS \"ID REQUEST\",\n\
			COALESCE(customer.name,'-') AS \"CUSTOMER NAME\",\n\
			COALESCE(customer.address,'-') AS \"CUSTOMER ADDRESS\", \n\
			COALESCE(customer.phone,'-') AS \"CUSTOMER PHONE\" \n\
			FROM table_cashit cashit \n\
			LEFT JOIN table_user customer ON customer.id=cashit.id_user \n\
			WHERE cashit.is_complete=FALSE AND cashit.is_approve=FALSE AND cashit.time_create>='"+param.date_from+"' AND cashit.time_create<='"+param.date_to+"'\n\
		) raw";
	tools_xlsx.exportFromDB(sql,param,'PaymentBuyerReport',function(success){
		tools_api.ok200(res,{report:tools_cms.param_jade(req).getFullPath()+success});
	},function(err){
		tools_api.error422(req,res,lang.generic.a);
	});
});

router.hook('patch','/seller',['admin'],['id'],function(req,res,role,next){
	var param = req.query;
	tools_db.one('UPDATE table_trolley_paid SET is_seller_paid=TRUE, is_admin_paid=TRUE WHERE id=${id} RETURNING id',param,function(data){
		tools_api.success200(res);
	},function(err){
		tools_api.error422(req,res,lang.generic.b);
	});
});

router.hook('delete','/seller',['admin'],['id'],function(req,res,role,next){
	var param = req.query;
	tools_db.one('UPDATE table_trolley_paid SET is_seller_paid=FALSE, is_admin_paid=TRUE WHERE id=${id} RETURNING id',param,function(data){
		tools_api.success200(res);
	},function(err){
		tools_api.error422(req,res,lang.generic.b);
	});
});

router.hook('patch','/buyer',['admin'],['id'],function(req,res,role,next){
	var param = req.query;
	tools_db.one('UPDATE table_cashit SET is_complete=TRUE, is_approve=TRUE WHERE id=${id} RETURNING id',param,function(data){
		tools_api.success200(res);
	},function(err){
		tools_api.error422(req,res,lang.generic.b);
	});
});

router.hook('delete','/buyer',['admin'],['id'],function(req,res,role,next){
	var param = req.query;
	tools_db.one('UPDATE table_cashit SET is_complete=TRUE, is_approve=FALSE WHERE id=${id} RETURNING id',param,function(data){
		tools_api.success200(res);
	},function(err){
		tools_api.error422(req,res,lang.generic.b);
	});
});

router.hook('get','/buyer/paid/:date_from/:date_to',['admin'],[],function(req,res,role,next){
	var param = req.params;
	param.date_from += " 00:00:00";
	param.date_to += " 23:59:59";
	tools_cms.tableSupport(req,res,"\n\
		SELECT raw.* \n\
		FROM \n\
		(\n\
			SELECT \n\
			cashit.name AS rekening_name,\n\
			cashit.owner AS rekening_owner,\n\
			cashit.number AS rekening_number,\n\
			cashit.is_approve,(NOW()::date-cashit.time_create::date) AS sla,\n\
			cashit.amount,cashit.time_create,\n\
			cashit.id,COALESCE(customer.name,'-') AS customer_name,\n\
			COALESCE(customer.address,'-') AS customer_address, \n\
			COALESCE(customer.phone,'-') AS customer_phone \n\
			FROM table_cashit cashit \n\
			LEFT JOIN table_user customer ON customer.id=cashit.id_user \n\
			WHERE cashit.is_complete=TRUE AND cashit.time_create>='"+param.date_from+"' AND cashit.time_create<='"+param.date_to+"'\n\
		) raw",
		["raw.customer_name","raw.customer_address","raw.customer_phone"],
		"raw.id DESC",function(row){
			var action = "<center>";
			if(row.is_approve) action += "<a title='Buyer Paid' href='#paid'><span class='glyphicon glyphicon-ok-circle' style='color: green;'/></a></center>";
			else action += "<a title='Buyer Not Paid' href='#notPaid'><span class='glyphicon glyphicon-remove-circle' style='color: red;'/></a></center>";
			return [
				row.id,
				row.customer_name+"<br>"+row.customer_address+"<br>"+row.customer_phone,
				row.rekening_name+"<br>"+row.rekening_owner+"<br>"+row.rekening_number,
				"<center>"+row.time_create+"<br>"+parseInt(row.sla).formatMoney(0)+" days</center>",
				parseInt(row.amount).formatMoney(0),
				action
			]
		});
});

module.exports = router.router;
