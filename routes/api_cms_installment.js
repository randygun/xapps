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

router.hook("post","/",['admin'],['name','code','terms','is_active'],function(req,res,role,next){
	var param = req.body;
	param.terms = "["+param.terms+"]";
	if(parseInt(param.id_edit)===0){
		tools_db.one('INSERT INTO table_installment (name,code,terms,is_active) VALUES (${name},${code},${terms},${is_active}) RETURNING id',param,function(data){
			tools_api.success200(res);
		},function(err){
			tools_api.error422(req,res,lang.generic.b);
		});
	}else{
		tools_db.one('UPDATE table_installment SET name=${name},code=${code},terms=${terms},is_active=${is_active} WHERE id=${id_edit} RETURNING id',param,function(data){
			tools_api.success200(res);
		},function(err){
			tools_api.error422(req,res,lang.generic.b);
		});
	}
});

router.hook("delete","/:id_installment",['admin'],[],function(req,res,role,next){
	var param = req.params;
	tools_db.one('DELETE FROM table_installment WHERE id=${id_installment} RETURNING id',param,function(data){
		tools_api.success200(res);
	},function(err){
		tools_api.error422(req,res,lang.generic.b);
	});
});

router.hook("get","/:id_installment",['admin'],[],function(req,res,role,next){
	var param = req.params;
	tools_db.one('SELECT * FROM table_installment WHERE id=${id_installment}',param,function(data){
		tools_api.ok200(res,{installment:data});
	},function(err){
		tools_api.error422(req,res,lang.generic.a);
	});
});

router.hook("get","/",['admin'],[],function(req,res,role,next){
	console.log('MASUK ADMIN '+role);
	var id_role = config.dynamic.role[role];
	var tambahan = "WHERE usr.id_role='"+id_role+"'";
	tools_cms.tableSupport(req,res,"\n\
		SELECT \n\
		*\n\
		FROM table_installment",
		["name","code"],
		"terms ASC",function(row){
			var action = "<a href='#editData' onclick='editData("+row.id+");'><span class='glyphicon glyphicon-pencil'/></a>&nbsp;&nbsp;&nbsp;";
			action += "<a href='#deleteData' onclick='deleteData("+row.id+");'><span class='glyphicon glyphicon-remove'/></a>";
			return [
				row.no,
				row.name,
				row.code,
				row.terms,
				row.is_active,
				row.time_update,
				row.time_create,
				action
			]
		});
});

module.exports = router.router;