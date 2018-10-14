var tools_routes = require(__dirname+"/../tools/tools_routes");
var tools_cms = require(__dirname+"/../tools/tools_cms");
var tools_api = require(__dirname+"/../tools/tools_api");
var tools_db = require(__dirname+"/../tools/tools_db");
var tools_all = require(__dirname+"/../tools/tools_all");
var config = require(__dirname+"/../config");
var lang = require(__dirname+"/../language");
var router = tools_routes.init();
var tools_xlsx = require(__dirname+"/../tools/tools_xlsx");

router.hook('get','/complaint/:id_store',['admin'],[],function(req,res,role,next){
	var param = req.params;
	tools_cms.tableSupport(req,res,"\n\
		SELECT raw.* FROM (\n\
			SELECT confirm.id,confirm.generated_number,tc.description,tc.attachments,tc.is_refund,to_char(tc.time_create,'YYYY-MM-DD HH24:MI:SS') AS time_create\n\
			FROM table_store ts\n\
			LEFT JOIN table_trolley_confirm confirm ON confirm.id_store=ts.id\n\
			LEFT JOIN table_complain tc ON tc.id_confirm = confirm.id\n\
			WHERE ts.id="+param.id_store+" AND tc.id IS NOT NULL \n\
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

router.hook('get','/employee/:id_store',['admin'],[],function(req,res,role,next){
	tools_cms.tableSupport(req,res,"\n\
		SELECT raw.* fROM (\n\
			SELECT * fROM table_user WHERE id_role="+config.dynamic.role.employee+" AND is_delete=FALSE AND id_store="+req.params.id_store+") raw",
		["raw.name","raw.username","raw.is_active::text"],
		"raw.id DESC",function(row){
			var action = "<center><a title='Delete Employee' href='#deleteEmployee' onclick='deleteEmployee("+row.id+");'><span class='glyphicon glyphicon-search'/></a>";
			return [
				row.id,
				row.username,
				"<a href='#switchEmployee' onclick='switchEmployee("+row.id+");'>"+row.is_active+"</a>",
				action
			]
		});
});
router.hook('get','/:id_store/location',['admin'],[],function(req,res,role,next){
	var param = req.params;
	tools_db.one('SELECT COALESCE(ST_X(loc.geom_location::geometry),0) AS lng,COALESCE(ST_Y(loc.geom_location::geometry),0) AS lat FROM table_store store LEFT JOIN table_location_gps loc ON loc.id=store.id_location WHERE store.id=${id_store}',param,function(data){
		tools_api.ok200(res,{location:data});
	},function(err){
		tools_api.error422(req,res,lang.generic.a);
	});
});

router.hook('get','/search',['admin'],[],function(req,res,role,next){
	tools_cms.select2Support(req,res,'\n\
		SELECT raw.*, raw.name||\' - \'||raw.address AS "text" FROM (\n\
			SELECT encode((row_to_json(data)::jsonb-\'id\')::text::bytea,\'base64\') AS id,store.address,store.name FROM (SELECT ST_Y(loc.geom_location::geometry) AS lat,ST_X(loc.geom_location::geometry) AS lng,store.id AS id FROM table_store store LEFT JOIN table_location_gps loc ON loc.id=store.id_location) data LEFT JOIN table_store store ON store.id=data.id\n\
		) raw',undefined,['raw.name','raw.address'],['raw.id ASC']);
});

router.hook('post','/report/:date_from/:date_to',['admin'],[],function(req,res,role,next){
	var param = req.params;
	param.date_from += " 00:00:00";
	param.date_to += " 23:59:59";
	tools_xlsx.exportFromDB('\n\
		SELECT \n\
		store.id AS "ID",\n\
		store.name AS "Name",\n\
		store.address AS "Address",\n\
		store.city AS "City",\n\
		COALESCE(store.phone,\'-\') AS "Phone", \n\
		store.time_create AS "Time Created",\n\
		usr.time_update AS "Time Last Activity",\n\
		COALESCE(cnt.cnt,0) AS "Total Transaction",\n\
		COALESCE(sm.sm,0) AS "Total Omzet",\n\
		store.is_delete AS "Is Deleted"\n\
		FROM table_store store \n\
		LEFT JOIN (SELECT MAX(time_update) AS time_update,id_store FROM table_user GROUP BY id_store) usr ON usr.id_store=store.id\n\
		LEFT JOIN (SELECT count(confirm.id) AS cnt, confirm.id_store FROM table_trolley_confirm confirm WHERE confirm.time_create>=\''+param.date_from+'\' AND confirm.time_create<=\''+param.date_to+'\' GROUP BY confirm.id_store) cnt ON cnt.id_store=store.id\n\
		LEFT JOIN (SELECT SUM(sm.sm) AS sm, confirm.id_store FROM table_trolley_confirm confirm LEFT JOIN (SELECT COALESCE(SUM(COALESCE(agreedetail.qty,confirmdetail.qty)*product.price)+COALESCE(confirm.fee_delivery,0),0) AS sm, confirm.id FROM table_trolley_confirm confirm LEFT JOIN table_trolley_confirm_agree agree ON agree.id_confirm=confirm.id LEFT JOIN table_trolley_paid paid ON paid.id_agree=agree.id LEFT JOIN table_trolley_confirm_detail confirmdetail ON confirmdetail.id_trolley_confirm=confirm.id LEFT JOIN table_trolley_confirm_agree_detail agreedetail ON agreedetail.id_confirm_detail=confirmdetail.id LEFT JOIN table_product product ON product.id=confirmdetail.id_product WHERE confirm.time_create>=\''+param.date_from+'\' AND confirm.time_create<=\''+param.date_to+'\' AND paid.id IS NOT NULL AND paid.is_refunded=FALSE GROUP BY confirm.id) sm ON sm.id=confirm.id WHERE confirm.time_create>=\''+param.date_from+'\' AND confirm.time_create<=\''+param.date_to+'\' GROUP BY confirm.id_store) sm ON sm.id_store=store.id\n\
		ORDER BY store.id ASC',param,'StoreReport',function(success){
		tools_api.ok200(res,{report:tools_cms.param_jade(req).getFullPath()+success});
	},function(err){
		tools_api.error422(req,res,lang.generic.a);
	});
});

router.hook('get','/order/all/:id_store/:date_from/:date_to',['admin'],[],function(req,res,role,next){
	var param = req.params;
	param.date_from += " 00:00:00";
	param.date_to += " 23:59:59";
	tools_cms.tableSupport(req,res,"\n\
		SELECT raw.* fROM (\n\
			SELECT paid.is_close,usr.id,usr.name,to_char(confirm.time_create::date,'DD/MM/YY') AS tanggal,location.name AS address \n\
			FROM table_trolley_confirm confirm \n\
			LEFT JOIN table_user usr ON usr.id=confirm.id_customer \n\
			LEFT JOIN table_location_gps location ON location.id=confirm.id_destination \n\
			LEFT JOIN table_trolley_confirm_agree agree ON agree.id_confirm = confirm.id \n\
			LEFT JOIN table_trolley_paid paid ON paid.id_agree=agree.id \n\
			WHERE confirm.id_store="+param.id_store+" AND agree.is_paid=TRUE AND confirm.time_create>='"+param.date_from+"' AND confirm.time_create<='"+param.date_to+"') raw",
		["raw.name","raw.address"],
		"raw.id DESC",function(row){
			var action = "<center><a title='Go To Customer Profile' href='#detailData' onclick='detailData("+row.id+");'><span class='glyphicon glyphicon-search'/></a>";
			if(row.is_close) action += "&nbsp;&nbsp;&nbsp;<a title='Order Completed. Go To Customer Profile' href='#detailData' onclick='detailData("+row.id+");'><span class='glyphicon glyphicon-ok-circle' style='color: green;'/></a></center>";
			return [
				row.tanggal,
				row.id,
				row.name,
				row.address,
				action
			]
		});
});


router.hook('get','/order/outstanding/:id_store/:date_from/:date_to',['admin'],[],function(req,res,role,next){
	var param = req.params;
	param.date_from += " 00:00:00";
	param.date_to += " 23:59:59";
	tools_cms.tableSupport(req,res,"\n\
		SELECT raw.* fROM (SELECT usr.id,usr.name,to_char(confirm.time_create::date,'DD/MM/YY') AS tanggal,location.name AS address FROM table_trolley_confirm confirm LEFT JOIN table_user usr ON usr.id=confirm.id_customer LEFT JOIN table_location_gps location ON location.id=confirm.id_destination LEFT JOIN table_trolley_confirm_agree agree ON agree.id_confirm = confirm.id LEFT JOIN table_trolley_paid paid ON paid.id_agree=agree.id WHERE confirm.id_store="+param.id_store+" AND agree.is_paid=TRUE AND paid.is_close=FALSE AND confirm.time_create>='"+param.date_from+"' AND confirm.time_create<='"+param.date_to+"') raw",
		["raw.name","raw.address"],
		"raw.id DESC",function(row){
			var action = "<a title='Go To Customer Profile' href='#detailData' onclick='detailData("+row.id+");'><span class='glyphicon glyphicon-search'/></a>";
			return [
				row.tanggal,
				row.id,
				row.name,
				row.address,
				action
			]
		});
});

router.hook('get','/profile',['admin'],['id_store'],function(req,res,role,next){
	var param = req.query;
	tools_db.one('SELECT store.* FROM table_store store WHERE id=${id_store}',param,function(store){
		tools_api.ok200(res,{store:store});
	},function(err){
		tools_api.error422(req,res,lang.store.b);
	});
});

router.hook('get','/:id_store/product',['admin'],[],function(req,res,role,next){
	var param = req.params;
	tools_cms.tableSupport(req,res,'\n\
		SELECT raw.* \n\
		FROM (\n\
			SELECT product.id,product.name,product.description,COALESCE(product.avatar,\'\') AS avatar,product.price,cat.name AS name_category, product.is_active \n\
			FROM table_product_category cat \n\
			LEFT JOIN table_product product ON product.id_category=cat.id \n\
			WHERE product.id IS NOT NULL and cat.id_store='+param.id_store+' AND product.is_delete=FALSE\n\
		) raw',['raw.name','raw.description','raw.is_active'],'raw.id DESC',function(row){
			return [
				row.id,
				row.name_category,
				"<img style='width: 66px; height: 66px;' src='"+row.avatar+"'/>&nbsp;&nbsp;&nbsp;<a href='"+row.avatar+"' target='blank'>"+row.name+"</a>",
				row.description,
				row.price,
				row.is_active
			]
		});
});

router.hook('get','/:date_from/:date_to',['admin'],[],function(req,res,role,next){
	var param = req.params;
	param.date_from += " 00:00:00";
	param.date_to += " 23:59:59";
	tools_cms.tableSupport(req,res,"\n\
		SELECT raw.* FROM (\n\
			SELECT store.id,store.name,store.address,COALESCE(store.phone,'-') AS phone, COALESCE(cnt.cnt,0) AS cnt,COALESCE(sm.sm,0) AS sm \n\
			FROM table_store store \n\
			LEFT JOIN (SELECT count(confirm.id) AS cnt, confirm.id_store FROM table_trolley_confirm confirm WHERE confirm.time_create>='"+param.date_from+"' AND confirm.time_create<='"+param.date_to+"' GROUP BY confirm.id_store) cnt ON cnt.id_store=store.id \n\
			LEFT JOIN (SELECT SUM(sm.sm) AS sm, confirm.id_store FROM table_trolley_confirm confirm LEFT JOIN (SELECT COALESCE(SUM(COALESCE(agreedetail.qty,confirmdetail.qty)*product.price)+COALESCE(confirm.fee_delivery,0),0) AS sm, confirm.id FROM table_trolley_confirm confirm LEFT JOIN table_trolley_confirm_agree agree ON agree.id_confirm=confirm.id LEFT JOIN table_trolley_paid paid ON paid.id_agree=agree.id LEFT JOIN table_trolley_confirm_detail confirmdetail ON confirmdetail.id_trolley_confirm=confirm.id LEFT JOIN table_trolley_confirm_agree_detail agreedetail ON agreedetail.id_confirm_detail=confirmdetail.id LEFT JOIN table_product product ON product.id=confirmdetail.id_product WHERE confirm.time_create>='"+param.date_from+"' AND confirm.time_create<='"+param.date_to+"' AND paid.id IS NOT NULL AND paid.is_refunded=FALSE GROUP BY confirm.id) sm ON sm.id=confirm.id WHERE confirm.time_create>='"+param.date_from+"' AND confirm.time_create<='"+param.date_to+"' GROUP BY confirm.id_store) sm ON sm.id_store=store.id\n\
			WHERE store.is_delete=FALSE) raw",
		["raw.name","raw.address","raw.phone"],
		"raw.id DESC",function(row){
			var action = "<a title='Go To Store Detail' href='#detailData' onclick='detailData("+row.id+");'><span class='glyphicon glyphicon-search'/></a>";
			return [
				row.id,
				row.name,
				row.address,
				row.phone,
				"<div align='right'>"+parseInt(row.cnt).formatMoney(0)+"</div>",
				"<div align='right'>"+parseInt(row.sm).formatMoney(0)+"</div>",
				action
			]
		});
});

router.hook('get','/blocked/:date_from/:date_to',['admin'],[],function(req,res,role,next){
	var param = req.params;
	param.date_from += " 00:00:00";
	param.date_to += " 23:59:59";
	tools_cms.tableSupport(req,res,"\n\
		SELECT raw.* FROM (\n\
			SELECT store.id,store.name,store.address,COALESCE(store.phone,'-') AS phone, COALESCE(cnt.cnt,0) AS cnt,COALESCE(sm.sm,0) AS sm \n\
			FROM table_store store \n\
			LEFT JOIN (SELECT count(confirm.id) AS cnt, confirm.id_store FROM table_trolley_confirm confirm WHERE confirm.time_create>='"+param.date_from+"' AND confirm.time_create<='"+param.date_to+"' GROUP BY confirm.id_store) cnt ON cnt.id_store=store.id \n\
			LEFT JOIN (SELECT SUM(sm.sm) AS sm, confirm.id_store FROM table_trolley_confirm confirm LEFT JOIN (SELECT COALESCE(SUM(COALESCE(agreedetail.qty,confirmdetail.qty)*product.price)+COALESCE(confirm.fee_delivery,0),0) AS sm, confirm.id FROM table_trolley_confirm confirm LEFT JOIN table_trolley_confirm_detail confirmdetail ON confirmdetail.id_trolley_confirm=confirm.id LEFT JOIN table_trolley_confirm_agree_detail agreedetail ON agreedetail.id_confirm_detail=confirmdetail.id LEFT JOIN table_product product ON product.id=confirmdetail.id_product WHERE confirm.time_create>='"+param.date_from+"' AND confirm.time_create<='"+param.date_to+"' GROUP BY confirm.id) sm ON sm.id=confirm.id WHERE confirm.time_create>='"+param.date_from+"' AND confirm.time_create<='"+param.date_to+"' GROUP BY confirm.id_store) sm ON sm.id_store=store.id\n\
			WHERE store.is_delete=TRUE\n\
		) raw",
		["raw.name","raw.address","raw.phone"],
		"raw.id DESC",function(row){
			var action = "<a title='Go To Store Detail' href='#detailData' onclick='detailData("+row.id+");'><span class='glyphicon glyphicon-search'/></a>";
			return [
				row.id,
				row.name,
				row.address,
				row.phone,
				"<div align='right'>"+parseInt(row.cnt).formatMoney(0)+"</div>",
				"<div align='right'>"+parseInt(row.sm).formatMoney(0)+"</div>",
				action
			]
		});
});

router.hook('delete','/',['admin'],['id_store'],function(req,res,role,next){
	var param = req.query;
	tools_db.one('UPDATE table_store SET is_delete=TRUE WHERE id=${id_store} RETURNING id',param,function(data){
		tools_api.success200(res);
	},function(err){
		tools_api.error422(req,res,lang.store.a);
	});
});

router.hook('delete','/blocked',['admin'],['id_store'],function(req,res,role,next){
	var param = req.query;
	tools_db.one('UPDATE table_store SET is_delete=FALSE WHERE id=${id_store} RETURNING id',param,function(data){
		tools_api.success200(res);
	},function(err){
		tools_api.error422(req,res,lang.store.a);
	});
});

router.hook('patch','/location/unlock',['admin'],['id_store'],function(req,res,role,next){
	var param = req.query;
	tools_db.one('UPDATE table_store SET lock_location=FALSE WHERE id=${id_store} RETURNING id',param,function(data){
		tools_api.success200(res);
	},function(err){
		tools_api.error422(req,res,lang.store.a);
	});
});

router.hook('patch','/location/lock',['admin'],['id_store'],function(req,res,role,next){
	var param = req.query;
	tools_db.one('UPDATE table_store SET lock_location=TRUE WHERE id=${id_store} RETURNING id',param,function(data){
		tools_api.success200(res);
	},function(err){
		tools_api.error422(req,res,lang.store.a);
	});
});

module.exports = router.router;
