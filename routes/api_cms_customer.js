var tools_routes = require(__dirname+"/../tools/tools_routes");
var tools_cms = require(__dirname+"/../tools/tools_cms");
var tools_api = require(__dirname+"/../tools/tools_api");
var tools_db = require(__dirname+"/../tools/tools_db");
var tools_all = require(__dirname+"/../tools/tools_all");
var config = require(__dirname+"/../config");
var lang = require(__dirname+"/../language");
var router = tools_routes.init();

router.hook('get','/complaint/:id_customer',['admin'],[],function(req,res,role,next){
	var param = req.params;
	tools_cms.tableSupport(req,res,"\n\
		SELECT raw.* FROM (\n\
			SELECT confirm.id,confirm.generated_number,tc.description,tc.attachments,tc.is_refund,to_char(tc.time_create,'YYYY-MM-DD HH24:MI:SS') AS time_create\n\
			FROM table_user ts\n\
			LEFT JOIN table_trolley_confirm confirm ON confirm.id_customer=ts.id\n\
			LEFT JOIN table_complain tc ON tc.id_confirm = confirm.id\n\
			WHERE ts.id="+param.id_customer+" AND tc.id IS NOT NULL \n\
			) raw",
		["raw.generated_number","raw.description"],
		"raw.id DESC",function(row){
			var attachments = "";
			row.attachments.forEach(function(attachment){
				attachments += "<a href='"+attachment+"' target='blank'>Click Here!</a><br>";
			});
			return [
				row.no,
				"<a href='"+tools_cms.param_jade(req).getFullPath()+"/order/report?id="+row.id+"'>"+row.generated_number+"</a>",
				row.description,
				attachments,
				row.is_refund,
				row.time_create
			]
		});
});

router.hook('get','/history/:id_user',['admin'],[],function(req,res,role,next){
	var param = req.params;
	var last_balance = null;
	var first_balance = null;
	var cr = 0;
	var db = 0;
	tools_cms.tableSupport(req,res,"\n\
		SELECT COALESCE(topup.vt_body,paid.vt_body) AS vt_body,hst.balance_current,hst.balance_after,hst.is_plus,store.id AS store_id,COALESCE(store.name,'-') AS store_name,COALESCE(store.address,'-') AS store_address,COALESCE(store.phone,'-') AS store_phone,COALESCE(order_number,'-') AS order_number,to_char(hst.time_create::date,'DD/MM') AS tanggal,COALESCE(hst.remark_en,'-') AS remark,COALESCE(hst.amount,0) AS amount,CASE WHEN hst.is_plus THEN 'CR' ELSE 'DB' END AS typ \n\
		FROM (SELECT * FROM table_balance_history WHERE id_user='"+param.id_user+"') hst \n\
		LEFT JOIN table_topup topup ON topup.generated_number=hst.order_number\n\
		LEFT JOIN table_trolley_confirm confirm ON confirm.generated_number=hst.order_number\n\
		LEFT JOIN table_trolley_confirm_agree agree ON agree.id_confirm=confirm.id\n\
		LEFT JOIN table_trolley_paid paid ON paid.id_agree=agree.id\n\
		LEFT JOIN table_store store ON store.id=confirm.id_store",
		["hst.remark_en"],
		"hst.id DESC",function(row){
			console.log('A'+row.vt_body);
			var bank = "-";
			var type = "-";
			console.log('BB');
			// row.vt_body = JSON.parse(row.vt_body);
			if(row.vt_body!==null) {
				bank = row.vt_body.bank;
				type = row.vt_body.payment_type;
			}
			console.log('B');
			if(last_balance===null) last_balance = row.balance_after;
			first_balance = row.balance_current;
			if(row.is_plus) cr+=parseInt(row.amount);
			else db+=parseInt(row.amount);
			var order_number = row.order_number;
			if(order_number==='-') order_number = '';
			else order_number = '<br>'+order_number;
			var store_info = "";
			console.log('C');
			if(row.store_id!==null){
				console.log('D');
				store_info="<br>"+row.store_name+"<br>"+row.store_address+"<br>"+row.store_phone;
			}
			console.log('E');
			return [
				row.tanggal,
				type,
				bank,
				row.remark+order_number+store_info+"<br>Rp. "+parseInt(row.amount).formatMoney(0),
				row.typ,
			]
		},function(){
			if(last_balance ===null) last_balance=0;
			if(first_balance ===null) first_balance=0;
			return {
				cr:cr,
				db:db,
				last_balance:last_balance,
				first_balance:first_balance
			};
		});
});

router.hook('get','/order/all/:id_user',['admin'],[],function(req,res,role,next){
	var param = req.params;
	tools_cms.tableSupport(req,res,"\n\
		SELECT raw.* FROM (SELECT paid.is_close,to_char(confirm.time_create::date,'DD/MM/YY') AS tanggal,confirm.id,store.name,store.address FROM table_trolley_confirm confirm LEFT JOIN table_store store ON store.id=confirm.id_store LEFT JOIN table_trolley_confirm_agree agree ON agree.id_confirm=confirm.id LEFT JOIN table_trolley_paid paid ON paid.id_agree=agree.id WHERE confirm.id_customer="+param.id_user+") raw",
		["raw.name","raw.address"],
		"raw.id DESC",function(row){
			var action = "<center><a title='Go To Order Detail' href='#detailData' onclick='detailData("+row.id+");'><span class='glyphicon glyphicon-search'/></a>";
			if(row.is_close) action += "&nbsp;&nbsp;&nbsp;<a title='Order Completed. Go To Order Detail' href='#detailData' onclick='detailData("+row.id+");'><span class='glyphicon glyphicon-ok-circle' style='color: green;'/></a></center>";
			return [
				row.tanggal,
				row.id,
				row.name,
				row.address,
				action
			]
		});
});


router.hook('get','/order/outstanding/:id_user',['admin'],[],function(req,res,role,next){
	var param = req.params;
	tools_cms.tableSupport(req,res,"\n\
		SELECT raw.* FROM (SELECT to_char(confirm.time_create::date,'DD/MM/YY') AS tanggal,confirm.id,store.name,store.address FROM table_trolley_confirm confirm LEFT JOIN table_store store ON store.id=confirm.id_store LEFT JOIN table_trolley_confirm_agree agree ON agree.id_confirm=confirm.id LEFT JOIN table_trolley_paid paid ON paid.id_agree=agree.id WHERE (paid.id IS NULL OR paid.is_close=FALSE) AND confirm.id_customer="+param.id_user+") raw",
		["raw.name","raw.address"],
		"raw.id DESC",function(row){
			var action = "<a title='Go To Order Detail' href='#detailData' onclick='detailData("+row.id+");'><span class='glyphicon glyphicon-search'/></a>";
			return [
				row.tanggal,
				row.id,
				row.name,
				row.address,
				action
			]
		});
});


router.hook('get','/',['admin'],[],function(req,res,role,next){
	tools_cms.tableSupport(req,res,"\n\
		SELECT dat.* FROM (SELECT usr.*,COALESCE(cnt.cnt,0) AS cnttrx FROM table_user usr LEFT JOIN (SELECT count(id) cnt,id_customer FROM table_trolley_confirm WHERE is_delete=FALSE GROUP BY id_customer) cnt ON cnt.id_customer=usr.id WHERE usr.id_role="+config.dynamic.role.buyer+" AND usr.is_active=TRUE) dat",
		["dat.name","dat.address"],
		"dat.id ASC",function(row){
			var action = "<a title='Go To Customer Detail' href='#detailData' onclick='detailData("+row.id+");'><span class='glyphicon glyphicon-search'/></a>";
			return [
				row.no,
				row.name,
				row.address,
				row.time_create,
				row.cnttrx,
				action
			]
		});
});

router.hook('delete','/',['admin'],['id_customer'],function(req,res,role,next){
	var param = req.query;
	tools_db.one('UPDATE table_user SET is_active=FALSE WHERE id=${id_customer} RETURNING id',param,function(data){
		tools_api.success200(res);
	},function(err){
		tools_api.error422(req,res,lang.customer.a);
	});
});

router.hook('get','/blocked',['admin'],[],function(req,res,role,next){
	tools_cms.tableSupport(req,res,"\n\
		SELECT dat.* FROM (SELECT usr.*,COALESCE(cnt.cnt,0) AS cnttrx FROM table_user usr LEFT JOIN (SELECT count(id) cnt,id_customer FROM table_trolley_confirm WHERE is_delete=FALSE GROUP BY id_customer) cnt ON cnt.id_customer=usr.id WHERE usr.id_role="+config.dynamic.role.buyer+" AND usr.is_active=FALSE) dat",
		["dat.name","dat.address"],
		"dat.id ASC",function(row){
			var action = "<a href='#detailDataBlocked' onclick='detailDataBlocked("+row.id+");'><span class='glyphicon glyphicon-search'/></a>";
			return [
				row.no,
				row.name,
				row.address,
				row.time_create,
				row.cnttrx,
				action
			]
		});
});

router.hook('delete','/blocked',['admin'],['id_customer'],function(req,res,role,next){
	var param = req.query;
	tools_db.one('UPDATE table_user SET is_active=TRUE WHERE id=${id_customer} RETURNING id',param,function(data){
		tools_api.success200(res);
	},function(err){
		tools_api.error422(req,res,lang.customer.a);
	});
});

module.exports = router.router;
