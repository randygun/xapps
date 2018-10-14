var tools_routes = require(__dirname+"/../tools/tools_routes");
var tools_cms = require(__dirname+"/../tools/tools_cms");
var tools_api = require(__dirname+"/../tools/tools_api");
var tools_db = require(__dirname+"/../tools/tools_db");
var tools_all = require(__dirname+"/../tools/tools_all");
var tools_email = require(__dirname+"/../tools/tools_email");
var config = require(__dirname+"/../config");
var lang = require(__dirname+"/../language");
var proc_login = require(__dirname+'/../proc/proc_login');
var proc_forget = require(__dirname+'/../proc/proc_forget');
var router = tools_routes.init();

var proc = require(__dirname+'/../proc/proc_login');

router.hook("get","/",['admin'],[],function(req,res,role,next){
	console.log('MASUK ADMIN '+role);
	var id_role = config.dynamic.role[role];
	var tambahan = "WHERE usr.id_role='"+id_role+"'";
	tools_cms.tableSupport(req,res,"\n\
		SELECT \n\
		users.id,users.username,users.id,users.id,users.avatar,\n\
		crole.code AS role_code, crole.description AS role_description,to_char(users.time_create,'YYYY-MM-DD HH24:MI:SS') AS time_create,to_char(users.time_update,'YYYY-MM-DD HH24:MI:SS') AS time_update, users.is_active,\n\
		COUNT(users.id) OVER() AS full_count\n\
		FROM (SELECT usr.* FROM table_user usr "+tambahan+") users \n\
		LEFT JOIN constant_role crole ON crole.id=users.id_role",
		["users.username","crole.code","crole.description","users.is_active::bool::text"],
		"users.username ASC",function(row){
			var action = "<a href='#editData' onclick='editData("+row.id+");'><span class='glyphicon glyphicon-pencil'/></a>&nbsp;&nbsp;&nbsp;";
			if(row.is_active) action += "<a href='#deleteData' onclick='deleteData("+row.id+");'><span class='glyphicon glyphicon-remove'/></a>";
			else action += "<a href='#activateData' onclick='activateData("+row.id+");'><span class='glyphicon glyphicon-ok'/></a>";
			return [
				row.no,
				"<img style='width: 33px; height: 33px;' src='"+row.avatar+"'/>&nbsp;&nbsp;&nbsp;"+row.username,
				row.role_code,
				row.role_description,
				row.time_create,
				row.time_update,
				row.is_active,
				action
			]
		});
});

module.exports = router.router;