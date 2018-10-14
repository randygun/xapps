var tools_routes = require(__dirname+"/../tools/tools_routes");
var tools_cms = require(__dirname+"/../tools/tools_cms");
var tools_api = require(__dirname+"/../tools/tools_api");
var tools_db = require(__dirname+"/../tools/tools_db");
var tools_all = require(__dirname+"/../tools/tools_all");
var tools_xlsx = require(__dirname+"/../tools/tools_xlsx");
var tools_email = require(__dirname+"/../tools/tools_email");
var config = require(__dirname+"/../config");
var lang = require(__dirname+"/../language");
var router = tools_routes.init();

router.hook('get','/complain/:id_order',['admin'],[],function(req,res,role,next){
	var param = req.params;
	tools_cms.tableSupport(req,res,"\n\
		SELECT raw.* FROM (\n\
			SELECT to_char(c.time_create,'YYYY-MM-DD HH24:MI:SS') AS time_create,c.id,c.description,c.attachments,c.is_refund, creator.username AS creator FROM table_complain c LEFT JOIN table_user creator ON creator.id=c.id_creator WHERE c.id_confirm="+param.id_order+" AND c.is_close=TRUE\n\
			) raw",
		["raw.description","raw.creator","raw.is_refund::text"],
		"raw.id DESC",function(row){
			var attachments = "";
			row.attachments.forEach(function(attachment){
				attachments += "<a href='"+attachment+"' target='blank'>"+attachment+"</a><br>";
			});
			return [
				row.no,
				row.description,
				attachments,
				row.is_refund,
				row.time_create
			]
		});
});

router.hook('post','/complain/draft',['admin'],['id_order','description','attachments'],function(req,res,role,next){
	var param = req.body;
	param.id_creator = req.token_access.id;
	tools_db.one('SELECT * FROM table_complain WHERE is_close=FALSE AND id_confirm=${id_order} ORDER BY id DESC LIMIT 1 OFFSET 0',param,function(data){
		param.id_complain = data.id;
		tools_db.one('UPDATE table_complain SET description=${description},attachments=${attachments},id_creator=${id_creator},is_close=FALSE,time_close=NULL,is_refund=NULL WHERE id=${id_complain} RETURNING id',param,function(data){
			tools_api.success200(res);
		},function(err){
			tools_api.error422(req,res,lang.generic.b);
		});
	},function(err){
		tools_db.one('INSERT INTO table_complain (id_confirm,description,attachments,is_refund,id_creator,is_close,time_close) VALUES (${id_order},${description},${attachments},NULL,${id_creator},FALSE,NULL) RETURNING id',param,function(data){
			tools_api.success200(res);
		},function(err){
			tools_api.error422(req,res,lang.generic.b);
		});
	});
});

router.hook('post','/complain',['admin'],['id_order','description','attachments','is_refund'],function(req,res,role,next){
	var param = req.body;
	param.id_creator = req.token_access.id;

	var sendEmail = function(){
		var subject= "";
		var jadefile = "";
		var tos = [];
		if(param.is_refund){
			subject = "Complaints Refunded";
			jadefile = "template_email_complain_refund";
		}else{
			subject = "Complaints Not Refunded";
			jadefile = "template_email_complain_notrefund";
		}
		param.role_seller = config.dynamic.role.seller;
		tools_db.one('SELECT customer.username AS customer,seller.username AS seller FROM table_trolley_confirm cf LEFT JOIN table_user customer ON customer.id=cf.id_customer LEFT JOIN (SELECT * FROM table_user WHERE id_role=${role_seller}) seller ON seller.id_store=cf.id_store WHERE cf.id=${id_order}',param,function(data){
			tos.push(data.customer);
			tos.push(data.seller);
			tools_email.logSend(req.app,tos,subject,jadefile,'email_complaint',{});
		},function(err){

		});
	};
	tools_db.one('UPDATE table_trolley_paid SET is_refunded=${is_refund} WHERE is_refunded=FALSE AND id_agree IN (SELECT id FROM table_trolley_confirm_agree WHERE id_confirm=${id_order}) RETURNING id',param,function(data){
		tools_db.one('SELECT * FROM table_complain WHERE is_close=FALSE AND id_confirm=${id_order} ORDER BY id DESC LIMIT 1 OFFSET 0',param,function(data){
			param.id_complain = data.id;
			tools_db.one('UPDATE table_complain SET description=${description},attachments=${attachments},is_refund=${is_refund},id_creator=${id_creator},is_close=TRUE,time_close=NOW() WHERE id=${id_complain} RETURNING id',param,function(data){
				tools_api.success200(res);
				sendEmail();
			},function(err){
				tools_api.error422(req,res,lang.generic.b);
			});
		},function(err){
			tools_db.one('INSERT INTO table_complain (id_confirm,description,attachments,is_refund,id_creator,is_close,time_close) VALUES (${id_order},${description},${attachments},${is_refund},${id_creator},TRUE,NOW()) RETURNING id',param,function(data){
				tools_api.success200(res);
				sendEmail();
			},function(err){
				tools_api.error422(req,res,lang.generic.b);
			});
		});
	},function(){
		tools_api.error422(req,res,lang.complaint.a);
	});	
});

router.hook('post','/report/:date_from/:date_to',['admin'],[],function(req,res,role,next){
	var param = req.params;
	param.date_from += " 00:00:00";
	param.date_to += " 23:59:59";
	tools_xlsx.exportFromDB('\n\
		SELECT \n\
		confirm.time_create AS "Time Order Created",\n\
		confirm.id AS "ID Order",\n\
		confirm.generated_number AS "Order Number",\n\
		paid.is_close AS "Is Completed",\n\
		confirm.is_delete AS "Is Rejected",\n\
		confirm.is_agreed AS "Is Agreed by Seller",\n\
		agree.is_paid AS "Is Paid by Buyer",\n\
		agree.remark AS "Remark from Seller",\n\
		paid.is_sent AS "Is Sent to Buyer",\n\
		paid.rating AS "Rating",\n\
		paid.time_close AS "Time Close",\n\
		paid.is_seller_paid AS "Is Paid by Admin",\n\
		paid.is_admin_paid AS "Is Admin Make Payment Decision",\n\
		COALESCE(cnt.jumagreed+COALESCE(confirm.fee_delivery,0),0) AS "Price Agreed",\n\
		COALESCE(cnt.jum+COALESCE(confirm.fee_delivery,0),0) AS "Price Ordered", \n\
		COALESCE(cnt.cnt,0) AS "Product Ordered",\n\
		COALESCE(cnt.cntagreed,0) AS "Product Order Agreed",\n\
		confirm.id,store.name AS "Store Name",\n\
		store.address AS "Store Address",\n\
		customer.name AS "Customer Name",\n\
		location.name AS "Customer Address" \n\
		FROM table_trolley_confirm confirm \n\
		LEFT JOIN table_store store ON store.id=confirm.id_store \n\
		LEFT JOIN table_user customer ON customer.id=confirm.id_customer \n\
		LEFT JOIN table_location_gps location ON location.id=confirm.id_destination \n\
		LEFT JOIN (\n\
			SELECT COUNT (detail.id) AS cnt,COUNT (CASE WHEN agreedetail.qty!=0 THEN 1 END) AS cntagreed,SUM(detail.qty*product.price) AS jum,SUM(agreedetail.qty*product.price) AS jumagreed,detail.id_trolley_confirm FROM table_trolley_confirm_detail detail \n\
			LEFT JOIN table_trolley_confirm_agree_detail agreedetail ON agreedetail.id_confirm_detail=detail.id \n\
			LEFT JOIN table_product product ON product.id=detail.id_product GROUP BY detail.id_trolley_confirm\n\
			) cnt ON cnt.id_trolley_confirm=confirm.id \n\
		LEFT JOIN table_trolley_confirm_agree agree ON agree.id_confirm=confirm.id \n\
		LEFT JOIN table_trolley_paid paid ON paid.id_agree=agree.id\n\
		WHERE confirm.time_create>=${date_from} AND confirm.time_create<=${date_to}\n\
		',param,'OrderReport',function(success){
		tools_api.ok200(res,{report:tools_cms.param_jade(req).getFullPath()+success});
	},function(err){
		tools_api.error422(req,res,lang.generic.a);
	});
});
router.hook('get','/outstanding/:date_from/:date_to',['admin'],[],function(req,res,role,next){
	var param = req.params;
	param.date_from += " 00:00:00";
	param.date_to += " 23:59:59";
	tools_cms.tableSupport(req,res,"\n\
		SELECT raw.* FROM (\n\
			SELECT confirm.generated_number,COALESCE(cnt.jum+COALESCE(confirm.fee_delivery,0),0) AS cntjum, COALESCE(cnt.cnt,0) AS cntproduct,confirm.id,store.name AS store_name,store.address AS store_address,customer.name AS customer_name,location.name AS customer_address \n\
			FROM table_trolley_confirm confirm LEFT JOIN table_store store ON store.id=confirm.id_store \n\
			LEFT JOIN table_user customer ON customer.id=confirm.id_customer LEFT JOIN table_location_gps location ON location.id=confirm.id_destination LEFT JOIN (SELECT COUNT (detail.id) AS cnt,SUM(detail.qty*product.price) AS jum,detail.id_trolley_confirm FROM table_trolley_confirm_detail detail LEFT JOIN table_product product ON product.id=detail.id_product GROUP BY detail.id_trolley_confirm) cnt ON cnt.id_trolley_confirm=confirm.id \n\
			WHERE confirm.is_agreed=FALSE AND confirm.is_delete=FALSE AND confirm.time_create>='"+param.date_from+"' AND confirm.time_create<='"+param.date_to+"'\n\
			) raw",
		["raw.store_name","raw.store_address",'raw.customer_name','raw.generated_number','raw.customer_address'],
		"raw.id DESC",function(row){
			var action = "<center><a title='Go To Order Detail' href='#detailData' onclick='detailData("+row.id+");'><span class='glyphicon glyphicon-search'/></a>";
			if(row.is_close) action += "&nbsp;&nbsp;&nbsp;<a title='Order Completed. Go To Order Detail' href='#detailData' onclick='detailData("+row.id+");'><span class='glyphicon glyphicon-ok-circle' style='color: green;'/></a></center>";
			return [
				row.generated_number,
				row.store_name,
				row.customer_name,
				row.store_address+"<center><strong><font color='darkgreen'>TO</font></strong></center>"+row.customer_address,
				"<center>"+row.cntproduct+"</center>",
				"<center>"+parseInt(row.cntjum).formatMoney(0)+"</center>",
				action
			]
		});
});

router.hook('get','/reject/:date_from/:date_to',['admin'],[],function(req,res,role,next){
	var param = req.params;
	param.date_from += " 00:00:00";
	param.date_to += " 23:59:59";
	tools_cms.tableSupport(req,res,"\n\
		SELECT raw.* FROM (\n\
			SELECT COALESCE(confirm.reject_who,'-') AS reject_who,COALESCE(confirm.reject_reason,'-') AS reject_reason,confirm.generated_number,COALESCE(cnt.jum+COALESCE(confirm.fee_delivery,0),0) AS cntjum, COALESCE(cnt.cnt,0) AS cntproduct,confirm.id,store.name AS store_name,store.address AS store_address,customer.name AS customer_name,location.name AS customer_address \n\
			FROM table_trolley_confirm confirm \n\
			LEFT JOIN table_store store ON store.id=confirm.id_store \n\
			LEFT JOIN table_user customer ON customer.id=confirm.id_customer \n\
			LEFT JOIN table_location_gps location ON location.id=confirm.id_destination \n\
			LEFT JOIN (SELECT COUNT (detail.id) AS cnt,SUM(detail.qty*product.price) AS jum,detail.id_trolley_confirm FROM table_trolley_confirm_detail detail LEFT JOIN table_product product ON product.id=detail.id_product GROUP BY detail.id_trolley_confirm) cnt ON cnt.id_trolley_confirm=confirm.id \n\
			WHERE confirm.is_delete=TRUE AND confirm.time_close>='"+param.date_from+"' AND confirm.time_close<='"+param.date_to+"'\n\
			) raw",
		["raw.store_name","raw.store_address",'raw.customer_name','raw.generated_number','raw.customer_address'],
		"raw.id DESC",function(row){
			var action = "<center><a title='Go To Order Detail' href='#detailData' onclick='detailData("+row.id+");'><span class='glyphicon glyphicon-search'/></a>";
			if(row.is_close) action += "&nbsp;&nbsp;&nbsp;<a title='Order Completed. Go To Order Detail' href='#detailData' onclick='detailData("+row.id+");'><span class='glyphicon glyphicon-ok-circle' style='color: green;'/></a></center>";
			return [
				row.generated_number,
				row.store_name,
				row.customer_name,
				row.store_address+"<center><strong><font color='darkgreen'>TO</font></strong></center>"+row.customer_address,
				"<center>"+row.cntproduct+"</center>",
				"<center>"+parseInt(row.cntjum).formatMoney(0)+"</center>",
				"Reject by "+row.reject_who+"<br>Reason: "+row.reject_reason,
				action
			]
		});
});

router.hook('get','/confirmation/:date_from/:date_to',['admin'],[],function(req,res,role,next){
	var param = req.params;
	param.date_from += " 00:00:00";
	param.date_to += " 23:59:59";
	tools_cms.tableSupport(req,res,"\n\
		SELECT raw.* FROM (\n\
			SELECT confirm.generated_number,confirm.is_delete,COALESCE(cnt.jumagreed+COALESCE(confirm.fee_delivery,0),0) AS cntjumagreed,COALESCE(cnt.jum+COALESCE(confirm.fee_delivery,0),0) AS cntjum, COALESCE(cnt.cnt,0) AS cntproduct,COALESCE(cnt.cntagreed,0) AS cntproductagreed,confirm.id,store.name AS store_name,store.address AS store_address,customer.name AS customer_name,location.name AS customer_address \n\
			FROM table_trolley_confirm confirm \n\
			LEFT JOIN table_store store ON store.id=confirm.id_store \n\
			LEFT JOIN table_user customer ON customer.id=confirm.id_customer \n\
			LEFT JOIN table_location_gps location ON location.id=confirm.id_destination \n\
			LEFT JOIN (SELECT COUNT (detail.id) AS cnt,COUNT (CASE WHEN agreedetail.qty!=0 THEN 1 END) AS cntagreed,SUM(detail.qty*product.price) AS jum,SUM(agreedetail.qty*product.price) AS jumagreed,detail.id_trolley_confirm FROM table_trolley_confirm_detail detail LEFT JOIN table_trolley_confirm_agree_detail agreedetail ON agreedetail.id_confirm_detail=detail.id LEFT JOIN table_product product ON product.id=detail.id_product GROUP BY detail.id_trolley_confirm) cnt ON cnt.id_trolley_confirm=confirm.id \n\
			LEFT JOIN table_trolley_confirm_agree agree ON agree.id_confirm=confirm.id \n\
			WHERE confirm.is_agreed=TRUE AND agree.is_paid=FALSE AND agree.time_create>='"+param.date_from+"' AND agree.time_create<='"+param.date_to+"'\n\
		) raw",
		["raw.store_name","raw.store_address",'raw.customer_name','raw.customer_address','raw.generated_number','raw.is_delete::text'],
		"raw.id DESC",function(row){
			var colorproduct = "";
			var colortotal = "";
			if(row.cntproduct!==row.cntproductagreed){
				colorproduct = "color='darkred'";
			}
			if(row.cntjum!==row.cntjumagreed){
				colortotal = "color='darkred'";
			}
			var action = "<center><a title='Go To Order Detail' href='#detailData' onclick='detailData("+row.id+");'><span class='glyphicon glyphicon-search'/></a>";
			if(row.is_close) action += "&nbsp;&nbsp;&nbsp;<a title='Order Completed. Go To Order Detail' href='#detailData' onclick='detailData("+row.id+");'><span class='glyphicon glyphicon-ok-circle' style='color: green;'/></a></center>";
			return [
				row.generated_number,
				row.store_name,
				row.customer_name,
				row.store_address+"<center><strong><font color='darkgreen'>TO</font></strong></center>"+row.customer_address,
				"<center><font "+colorproduct+">"+row.cntproduct+"</font></center><center><font color='green'><strong>"+row.cntproductagreed+"</strong></font></center>",
				"<center><font "+colortotal+">"+parseInt(row.cntjum).formatMoney(0)+"</font></center><center><font color='green'><strong>"+parseInt(row.cntjumagreed).formatMoney(0)+"</strong></font></center>",
				row.is_delete,
				action
			]
		});
});

router.hook('get','/deliverypending/:date_from/:date_to',['admin'],[],function(req,res,role,next){
	var param = req.params;
	param.date_from += " 00:00:00";
	param.date_to += " 23:59:59";
	tools_cms.tableSupport(req,res,"\n\
		SELECT raw.* FROM (\n\
			SELECT confirm.generated_number,confirm.is_delete,COALESCE(cnt.jumagreed+COALESCE(confirm.fee_delivery,0),0) AS cntjumagreed,COALESCE(cnt.jum+COALESCE(confirm.fee_delivery,0),0) AS cntjum, COALESCE(cnt.cnt,0) AS cntproduct,COALESCE(cnt.cntagreed,0) AS cntproductagreed,confirm.id,store.name AS store_name,store.address AS store_address,customer.name AS customer_name,location.name AS customer_address \n\
			FROM table_trolley_confirm confirm \n\
			LEFT JOIN table_store store ON store.id=confirm.id_store \n\
			LEFT JOIN table_user customer ON customer.id=confirm.id_customer LEFT JOIN table_location_gps location ON location.id=confirm.id_destination LEFT JOIN (SELECT COUNT (detail.id) AS cnt,COUNT (CASE WHEN agreedetail.qty!=0 THEN 1 END) AS cntagreed,SUM(detail.qty*product.price) AS jum,SUM(agreedetail.qty*product.price) AS jumagreed,detail.id_trolley_confirm FROM table_trolley_confirm_detail detail LEFT JOIN table_trolley_confirm_agree_detail agreedetail ON agreedetail.id_confirm_detail=detail.id LEFT JOIN table_product product ON product.id=detail.id_product GROUP BY detail.id_trolley_confirm) cnt ON cnt.id_trolley_confirm=confirm.id LEFT JOIN table_trolley_confirm_agree agree ON agree.id_confirm=confirm.id \n\
			LEFT JOIN table_trolley_paid paid ON paid.id_agree=agree.id \n\
			WHERE confirm.is_agreed=TRUE AND agree.is_paid=TRUE AND paid.is_sent=FALSE AND paid.time_create>='"+param.date_from+"' AND paid.time_create<='"+param.date_to+"'\n\
			) raw",
		["raw.store_name","raw.store_address",'raw.customer_name','raw.generated_number','raw.customer_address'],
		"raw.id DESC",function(row){
			var colorproduct = "";
			var colortotal = "";
			if(row.cntproduct!==row.cntproductagreed){
				colorproduct = "color='darkred'";
			}
			if(row.cntjum!==row.cntjumagreed){
				colortotal = "color='darkred'";
			}
			var action = "<center><a title='Go To Order Detail' href='#detailData' onclick='detailData("+row.id+");'><span class='glyphicon glyphicon-search'/></a>";
			if(row.is_close) action += "&nbsp;&nbsp;&nbsp;<a title='Order Completed. Go To Order Detail' href='#detailData' onclick='detailData("+row.id+");'><span class='glyphicon glyphicon-ok-circle' style='color: green;'/></a></center>";
			return [
				row.generated_number,
				row.store_name,
				row.customer_name,
				row.store_address+"<center><strong><font color='darkgreen'>TO</font></strong></center>"+row.customer_address,
				"<center><font "+colorproduct+">"+row.cntproduct+"</font></center><center><font color='green'><strong>"+row.cntproductagreed+"</strong></font></center>",
				"<center><font "+colortotal+">"+parseInt(row.cntjum).formatMoney(0)+"</font></center><center><font color='green'><strong>"+parseInt(row.cntjumagreed).formatMoney(0)+"</strong></font></center>",
				action
			]
		});
});

router.hook('get','/complaint/open/:date_from/:date_to',['admin'],[],function(req,res,role,next){
	var param = req.params;
	param.date_from += " 00:00:00";
	param.date_to += " 23:59:59";
	tools_cms.tableSupport(req,res,"\n\
		SELECT raw.* FROM (\n\
			SELECT \n\
			confirm.generated_number,paid.is_close,confirm.is_delete,COALESCE(cnt.jumagreed+COALESCE(confirm.fee_delivery,0),0) AS cntjumagreed,COALESCE(cnt.jum+COALESCE(confirm.fee_delivery,0),0) AS cntjum, COALESCE(cnt.cnt,0) AS cntproduct,COALESCE(cnt.cntagreed,0) AS cntproductagreed,confirm.id,store.name AS store_name,store.address AS store_address,customer.name AS customer_name,location.name AS customer_address \n\
			FROM table_trolley_confirm confirm \n\
			LEFT JOIN table_store store ON store.id=confirm.id_store \n\
			LEFT JOIN table_user customer ON customer.id=confirm.id_customer \n\
			LEFT JOIN table_location_gps location ON location.id=confirm.id_destination \n\
			LEFT JOIN (SELECT COUNT (detail.id) AS cnt,COUNT (CASE WHEN agreedetail.qty!=0 THEN 1 END) AS cntagreed,SUM(detail.qty*product.price) AS jum,SUM(agreedetail.qty*product.price) AS jumagreed,detail.id_trolley_confirm FROM table_trolley_confirm_detail detail \n\
				LEFT JOIN table_trolley_confirm_agree_detail agreedetail ON agreedetail.id_confirm_detail=detail.id \n\
				LEFT JOIN table_product product ON product.id=detail.id_product GROUP BY detail.id_trolley_confirm) cnt ON cnt.id_trolley_confirm=confirm.id \n\
			LEFT JOIN table_trolley_confirm_agree agree ON agree.id_confirm=confirm.id \n\
			LEFT JOIN table_trolley_paid paid ON paid.id_agree=agree.id \n\
			LEFT JOIN (SELECT MAX(id) AS maxid,id_confirm FROM table_complain GROUP BY id_confirm) complainmax ON complainmax.id_confirm=confirm.id\n\
			LEFT JOIN table_complain complain ON complain.id=complainmax.maxid\n\
			WHERE complain.is_close=FALSE AND complain.time_create>='"+param.date_from+"' AND complain.time_create<='"+param.date_to+"'\n\
		) raw",
		["raw.store_name","raw.store_address",'raw.customer_name','raw.generated_number','raw.customer_address','raw.is_close::text'],
		"raw.id DESC",function(row){
			var colorproduct = "";
			var colortotal = "";
			if(row.cntproduct!==row.cntproductagreed){
				colorproduct = "color='darkred'";
			}
			if(row.cntjum!==row.cntjumagreed){
				colortotal = "color='darkred'";
			}
			var action = "<center><a title='Go To Order Detail' href='#detailData' onclick='detailData("+row.id+");'><span class='glyphicon glyphicon-search'/></a>";
			if(row.is_close) action += "&nbsp;&nbsp;&nbsp;<a title='Order Completed. Go To Order Detail' href='#detailData' onclick='detailData("+row.id+");'><span class='glyphicon glyphicon-ok-circle' style='color: green;'/></a></center>";
			return [
				row.generated_number,
				row.store_name,
				row.customer_name,
				row.store_address+"<center><strong><font color='darkgreen'>TO</font></strong></center>"+row.customer_address,
				"<center><font "+colorproduct+">"+row.cntproduct+"</font></center><center><font color='green'><strong>"+row.cntproductagreed+"</strong></font></center>",
				"<center><font "+colortotal+">"+parseInt(row.cntjum).formatMoney(0)+"</font></center><center><font color='green'><strong>"+parseInt(row.cntjumagreed).formatMoney(0)+"</strong></font></center>",
				row.is_close,
				action
			]
		});
});

router.hook('get','/complaint/complete/:date_from/:date_to',['admin'],[],function(req,res,role,next){
	var param = req.params;
	param.date_from += " 00:00:00";
	param.date_to += " 23:59:59";
	tools_cms.tableSupport(req,res,"\n\
		SELECT raw.* FROM (\n\
			SELECT \n\
			confirm.generated_number,paid.is_close,confirm.is_delete,COALESCE(cnt.jumagreed+COALESCE(confirm.fee_delivery,0),0) AS cntjumagreed,COALESCE(cnt.jum+COALESCE(confirm.fee_delivery,0),0) AS cntjum, COALESCE(cnt.cnt,0) AS cntproduct,COALESCE(cnt.cntagreed,0) AS cntproductagreed,confirm.id,store.name AS store_name,store.address AS store_address,customer.name AS customer_name,location.name AS customer_address \n\
			FROM table_trolley_confirm confirm \n\
			LEFT JOIN table_store store ON store.id=confirm.id_store \n\
			LEFT JOIN table_user customer ON customer.id=confirm.id_customer \n\
			LEFT JOIN table_location_gps location ON location.id=confirm.id_destination \n\
			LEFT JOIN (SELECT COUNT (detail.id) AS cnt,COUNT (CASE WHEN agreedetail.qty!=0 THEN 1 END) AS cntagreed,SUM(detail.qty*product.price) AS jum,SUM(agreedetail.qty*product.price) AS jumagreed,detail.id_trolley_confirm FROM table_trolley_confirm_detail detail \n\
				LEFT JOIN table_trolley_confirm_agree_detail agreedetail ON agreedetail.id_confirm_detail=detail.id \n\
				LEFT JOIN table_product product ON product.id=detail.id_product GROUP BY detail.id_trolley_confirm) cnt ON cnt.id_trolley_confirm=confirm.id \n\
			LEFT JOIN table_trolley_confirm_agree agree ON agree.id_confirm=confirm.id \n\
			LEFT JOIN table_trolley_paid paid ON paid.id_agree=agree.id \n\
			LEFT JOIN (SELECT MAX(id) AS maxid,id_confirm FROM table_complain GROUP BY id_confirm) complainmax ON complainmax.id_confirm=confirm.id\n\
			LEFT JOIN table_complain complain ON complain.id=complainmax.maxid\n\
			WHERE complain.is_close=TRUE AND complain.time_close>='"+param.date_from+"' AND complain.time_close<='"+param.date_to+"'\n\
		) raw",
		["raw.store_name","raw.store_address",'raw.customer_name','raw.generated_number','raw.customer_address','raw.is_close::text'],
		"raw.id DESC",function(row){
			var colorproduct = "";
			var colortotal = "";
			if(row.cntproduct!==row.cntproductagreed){
				colorproduct = "color='darkred'";
			}
			if(row.cntjum!==row.cntjumagreed){
				colortotal = "color='darkred'";
			}
			var action = "<center><a title='Go To Order Detail' href='#detailData' onclick='detailData("+row.id+");'><span class='glyphicon glyphicon-search'/></a>";
			if(row.is_close) action += "&nbsp;&nbsp;&nbsp;<a title='Order Completed. Go To Order Detail' href='#detailData' onclick='detailData("+row.id+");'><span class='glyphicon glyphicon-ok-circle' style='color: green;'/></a></center>";
			return [
				row.generated_number,
				row.store_name,
				row.customer_name,
				row.store_address+"<center><strong><font color='darkgreen'>TO</font></strong></center>"+row.customer_address,
				"<center><font "+colorproduct+">"+row.cntproduct+"</font></center><center><font color='green'><strong>"+row.cntproductagreed+"</strong></font></center>",
				"<center><font "+colortotal+">"+parseInt(row.cntjum).formatMoney(0)+"</font></center><center><font color='green'><strong>"+parseInt(row.cntjumagreed).formatMoney(0)+"</strong></font></center>",
				row.is_close,
				action
			]
		});
});

router.hook('get','/complaint/none/:date_from/:date_to',['admin'],[],function(req,res,role,next){
	var param = req.params;
	param.date_from += " 00:00:00";
	param.date_to += " 23:59:59";
	tools_cms.tableSupport(req,res,"\n\
		SELECT raw.* FROM (\n\
			SELECT \n\
			confirm.generated_number,paid.is_close,confirm.is_delete,COALESCE(cnt.jumagreed+COALESCE(confirm.fee_delivery,0),0) AS cntjumagreed,COALESCE(cnt.jum+COALESCE(confirm.fee_delivery,0),0) AS cntjum, COALESCE(cnt.cnt,0) AS cntproduct,COALESCE(cnt.cntagreed,0) AS cntproductagreed,confirm.id,store.name AS store_name,store.address AS store_address,customer.name AS customer_name,location.name AS customer_address \n\
			FROM table_trolley_confirm confirm \n\
			LEFT JOIN table_store store ON store.id=confirm.id_store \n\
			LEFT JOIN table_user customer ON customer.id=confirm.id_customer \n\
			LEFT JOIN table_location_gps location ON location.id=confirm.id_destination \n\
			LEFT JOIN (SELECT COUNT (detail.id) AS cnt,COUNT (CASE WHEN agreedetail.qty!=0 THEN 1 END) AS cntagreed,SUM(detail.qty*product.price) AS jum,SUM(agreedetail.qty*product.price) AS jumagreed,detail.id_trolley_confirm FROM table_trolley_confirm_detail detail \n\
				LEFT JOIN table_trolley_confirm_agree_detail agreedetail ON agreedetail.id_confirm_detail=detail.id \n\
				LEFT JOIN table_product product ON product.id=detail.id_product GROUP BY detail.id_trolley_confirm) cnt ON cnt.id_trolley_confirm=confirm.id \n\
			LEFT JOIN table_trolley_confirm_agree agree ON agree.id_confirm=confirm.id \n\
			LEFT JOIN table_trolley_paid paid ON paid.id_agree=agree.id \n\
			LEFT JOIN (SELECT MAX(id) AS maxid,id_confirm FROM table_complain GROUP BY id_confirm) complainmax ON complainmax.id_confirm=confirm.id\n\
			LEFT JOIN table_complain complain ON complain.id=complainmax.maxid\n\
			WHERE complain.is_close IS NULL AND confirm.is_agreed=TRUE AND agree.is_paid=TRUE AND paid.is_sent=TRUE AND confirm.time_create>='"+param.date_from+"' AND confirm.time_create<='"+param.date_to+"'\n\
		) raw",
		["raw.store_name","raw.store_address",'raw.customer_name','raw.generated_number','raw.customer_address','raw.is_close::text'],
		"raw.id DESC",function(row){
			var colorproduct = "";
			var colortotal = "";
			if(row.cntproduct!==row.cntproductagreed){
				colorproduct = "color='darkred'";
			}
			if(row.cntjum!==row.cntjumagreed){
				colortotal = "color='darkred'";
			}
			var action = "<center><a title='Go To Order Detail' href='#detailData' onclick='detailData("+row.id+");'><span class='glyphicon glyphicon-search'/></a>";
			if(row.is_close) action += "&nbsp;&nbsp;&nbsp;<a title='Order Completed. Go To Order Detail' href='#detailData' onclick='detailData("+row.id+");'><span class='glyphicon glyphicon-ok-circle' style='color: green;'/></a></center>";
			return [
				row.generated_number,
				row.store_name,
				row.customer_name,
				row.store_address+"<center><strong><font color='darkgreen'>TO</font></strong></center>"+row.customer_address,
				"<center><font "+colorproduct+">"+row.cntproduct+"</font></center><center><font color='green'><strong>"+row.cntproductagreed+"</strong></font></center>",
				"<center><font "+colortotal+">"+parseInt(row.cntjum).formatMoney(0)+"</font></center><center><font color='green'><strong>"+parseInt(row.cntjumagreed).formatMoney(0)+"</strong></font></center>",
				row.is_close,
				action
			]
		});
});

router.hook('get','/complete/:date_from/:date_to',['admin'],[],function(req,res,role,next){
	var param = req.params;
	param.date_from += " 00:00:00";
	param.date_to += " 23:59:59";
	tools_cms.tableSupport(req,res,"\n\
		SELECT raw.* FROM (\n\
			SELECT confirm.generated_number,paid.is_close,confirm.is_delete,COALESCE(cnt.jumagreed+COALESCE(confirm.fee_delivery,0),0) AS cntjumagreed,COALESCE(cnt.jum+COALESCE(confirm.fee_delivery,0),0) AS cntjum, COALESCE(cnt.cnt,0) AS cntproduct,COALESCE(cnt.cntagreed,0) AS cntproductagreed,confirm.id,store.name AS store_name,store.address AS store_address,customer.name AS customer_name,location.name AS customer_address FROM table_trolley_confirm confirm LEFT JOIN table_store store ON store.id=confirm.id_store LEFT JOIN table_user customer ON customer.id=confirm.id_customer LEFT JOIN table_location_gps location ON location.id=confirm.id_destination LEFT JOIN (SELECT COUNT (detail.id) AS cnt,COUNT (CASE WHEN agreedetail.qty!=0 THEN 1 END) AS cntagreed,SUM(detail.qty*product.price) AS jum,SUM(agreedetail.qty*product.price) AS jumagreed,detail.id_trolley_confirm FROM table_trolley_confirm_detail detail LEFT JOIN table_trolley_confirm_agree_detail agreedetail ON agreedetail.id_confirm_detail=detail.id LEFT JOIN table_product product ON product.id=detail.id_product GROUP BY detail.id_trolley_confirm) cnt ON cnt.id_trolley_confirm=confirm.id LEFT JOIN table_trolley_confirm_agree agree ON agree.id_confirm=confirm.id LEFT JOIN table_trolley_paid paid ON paid.id_agree=agree.id \n\
			WHERE confirm.is_agreed=TRUE AND agree.is_paid=TRUE AND paid.is_sent=TRUE AND paid.time_close>='"+param.date_from+"' AND paid.time_close<='"+param.date_to+"'\n\
		) raw",
		["raw.store_name","raw.store_address",'raw.customer_name','raw.generated_number','raw.customer_address','raw.is_close::text'],
		"raw.id DESC",function(row){
			var colorproduct = "";
			var colortotal = "";
			if(row.cntproduct!==row.cntproductagreed){
				colorproduct = "color='darkred'";
			}
			if(row.cntjum!==row.cntjumagreed){
				colortotal = "color='darkred'";
			}
			var action = "<center><a title='Go To Order Detail' href='#detailData' onclick='detailData("+row.id+");'><span class='glyphicon glyphicon-search'/></a>";
			if(row.is_close) action += "&nbsp;&nbsp;&nbsp;<a title='Order Completed. Go To Order Detail' href='#detailData' onclick='detailData("+row.id+");'><span class='glyphicon glyphicon-ok-circle' style='color: green;'/></a></center>";
			return [
				row.generated_number,
				row.store_name,
				row.customer_name,
				row.store_address+"<center><strong><font color='darkgreen'>TO</font></strong></center>"+row.customer_address,
				"<center><font "+colorproduct+">"+row.cntproduct+"</font></center><center><font color='green'><strong>"+row.cntproductagreed+"</strong></font></center>",
				"<center><font "+colortotal+">"+parseInt(row.cntjum).formatMoney(0)+"</font></center><center><font color='green'><strong>"+parseInt(row.cntjumagreed).formatMoney(0)+"</strong></font></center>",
				row.is_close,
				action
			]
		});
});

module.exports = router.router;
