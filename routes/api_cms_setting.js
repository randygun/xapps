var tools_routes = require(__dirname+"/../tools/tools_routes");
var tools_cms = require(__dirname+"/../tools/tools_cms");
var tools_api = require(__dirname+"/../tools/tools_api");
var tools_db = require(__dirname+"/../tools/tools_db");
var tools_all = require(__dirname+"/../tools/tools_all");
var config = require(__dirname+"/../config");
var lang = require(__dirname+"/../language");
var router = tools_routes.init();

router.hook('get','/category',['admin'],[],function(req,res,role,next){
	tools_cms.tableSupport(req,res,"\n\
		SELECT raw.* FROM (SELECT * FROM template_product_category) raw",
		["raw.name","raw.description"],
		"raw.id ASC",function(row){
			var action = "<center>";
			// action += "<a href='#detailData' onclick='detailData("+row.id+");'><span class='glyphicon glyphicon-search'/></a>";
			action += "&nbsp;&nbsp;&nbsp;<a href='#editCategory' onclick='editCategory("+row.id+");'><span class='glyphicon glyphicon-pencil'/></a>";
			action += "&nbsp;&nbsp;&nbsp;<a href='#removeCategory' onclick='removeCategory("+row.id+");'><span class='glyphicon glyphicon-remove'/></a>";
			action += "</center>";
			return [
				row.id,
				row.name,
				row.description,				
				action
			]
		});
});

router.hook('get','/application/:id_setting',['admin'],[],function(req,res,role,next){
	var param = req.params;
	tools_db.one("SELECT raw.* FROM (SELECT cs.*,tsd.value FROM constant_setting cs LEFT JOIN (SELECT MAX(id) maxid,id_setting FROM table_settings GROUP BY id_setting) ts ON ts.id_setting=cs.id LEFT JOIN table_settings tsd ON tsd.id=ts.maxid WHERE cs.code='fee_perkm' OR cs.code='distance_radius' OR cs.code='zoom_level' OR cs.code='distance_max' OR cs.code='is_maintenance' OR cs.code='money_max_cashout' OR cs.code='timer_swipe_ads' OR cs.code='company_address' OR cs.code='commission' OR cs.code='support_email' OR cs.code='support_phone' OR cs.code='support_operationaltime') raw WHERE raw.id=${id_setting}",param,function(setting){
		tools_api.ok200(res,{setting:setting});
	},function(err){
		tools_api.error422(req,res,lang.generic.a);
	});
});

router.hook('put','/application',['admin'],['id_setting','value'],function(req,res,role,next){
	var param = req.query;
	param.id_user = req.token_access.id;
	tools_db.one('INSERT INTO table_settings (id_user,value,id_setting) VALUES (${id_user},${value},${id_setting}) RETURNING id',param,function(data){
		tools_api.success200(res);
	},function(err){
		tools_api.error422(req,res,lang.setting.a);
	});
});

router.hook('get','/application',['admin'],[],function(req,res,role,next){
	tools_cms.tableSupport(req,res,"\n\
		SELECT raw.* FROM (SELECT cs.*,tsd.value FROM constant_setting cs LEFT JOIN (SELECT MAX(id) maxid,id_setting FROM table_settings GROUP BY id_setting) ts ON ts.id_setting=cs.id LEFT JOIN table_settings tsd ON tsd.id=ts.maxid WHERE cs.code='fee_perkm' OR cs.code='distance_radius' OR cs.code='zoom_level' OR cs.code='distance_max' OR cs.code='is_maintenance' OR cs.code='money_max_cashout' OR cs.code='timer_swipe_ads' OR cs.code='company_address' OR cs.code='commission' OR cs.code='support_email' OR cs.code='support_phone' OR cs.code='support_operationaltime') raw",
		["raw.code","raw.description","raw.value"],
		"raw.id DESC",function(row){
			var action = "<center>";
			action += "<a href='#editSetting' onclick='editSetting("+row.id+");'><span class='glyphicon glyphicon-pencil'/></a>";
			action += '</center>';
			return [
				row.id,
				row.code,
				row.description,
				row.value,
				action
			]
		});
});

module.exports = router.router;
