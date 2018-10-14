var tools_routes = require(__dirname+"/../tools/tools_routes");
var tools_cms = require(__dirname+"/../tools/tools_cms");
var tools_api = require(__dirname+"/../tools/tools_api");
var tools_db = require(__dirname+"/../tools/tools_db");
var tools_all = require(__dirname+"/../tools/tools_all");
var tools_xlsx = require(__dirname+"/../tools/tools_xlsx");
var config = require(__dirname+"/../config");
var lang = require(__dirname+"/../language");
var router = tools_routes.init();

router.hook('get','/',['admin'],[],function(req,res,role,next){
	tools_cms.tableSupport(req,res,"\n\
		SELECT raw.* FROM (\n\
			SELECT data.*,mindata.countid \n\
			FROM table_notification_group raw \n\
			LEFT JOIN (SELECT MIN(id) AS minid,COUNT(id) AS countid,id_group FROM table_notification GROUP BY id_group) mindata ON mindata.id_group=raw.id \n\
			LEFT JOIN (\n\
				SELECT \n\
				tn.id,\n\
				to_char(tn.time_create,'YYYY-MM-DD HH24:MI:SS') AS time_create,\n\
				tn.sent->>'job'::text AS job,\n\
				tn.sent->>'title'::text AS title,\n\
				tn.sent->>'message'::text AS message,\n\
				usr.username \n\
				FROM table_notification tn \n\
				LEFT JOIN table_user usr ON usr.id=tn.id_user \n\
				WHERE tn.sent->>'job'::text='manual_push'\n\
				) data ON data.id=mindata.minid\n\
			) raw",
		["raw.username","raw.job","raw.title","raw.message"],
		"raw.id DESC",function(row){
			return [
				row.no,
				row.job,
				row.title,
				row.message,
				row.time_create,
				row.countid+" Users"
			]
		});
});

router.hook('post','/',['admin'],['title','message','recipient'],function(req,res,role,next){
	var param = req.body;
	param.id_user = req.token_access.id;
	tools_db.one('INSERT INTO table_notification_group (id_user) VALUES (${id_user}) RETURNING id',param,function(data){
		param.id_group = data.id;
		var roleuser = '';
		if(param.recipient === 'buyer') roleuser = 'usr.id_role='+config.dynamic.role.buyer+' AND ';
		else if (param.recipient === 'seller') roleuser = 'usr.id_role='+config.dynamic.role.seller+' AND ';
		tools_db.manyOrNone('\n\
			INSERT INTO table_notification (id_user,device_token,sent,id_group) \n\
			SELECT sent.id_user,dev.token_fcm,row_to_json(sent) AS sent,${id_group} FROM (SELECT \'manual_push\' AS job, usr.id AS id_user,${title} AS title,${message} AS message FROM table_user usr WHERE '+roleuser+'usr.is_active=TRUE AND usr.is_delete=FALSE) sent LEFT JOIN table_user usr ON usr.id=sent.id_user LEFT JOIN table_device dev ON dev.id=usr.id_device WHERE dev.token_fcm IS NOT NULL',param,function(users){
				tools_api.success200(res);
		},function(err){
			tools_api.error422(req,res,lang.generic.b);
		});
	},function(err){
		tools_api.error422(req,res,lang.generic.b);
	});
});

module.exports = router.router;
