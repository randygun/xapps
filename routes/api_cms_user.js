var tools_email = require(__dirname+"/../tools/tools_email");
var tools_routes = require(__dirname+"/../tools/tools_routes");
var tools_cms = require(__dirname+"/../tools/tools_cms");
var tools_api = require(__dirname+"/../tools/tools_api");
var tools_db = require(__dirname+"/../tools/tools_db");
var tools_all = require(__dirname+"/../tools/tools_all");
var config = require(__dirname+"/../config");
var lang = require(__dirname+"/../language");
var router = tools_routes.init();
var proc_userupdate = require(__dirname+"/../proc/proc_userupdate");
var proc_login = require(__dirname+'/../proc/proc_login');
var proc_forget = require(__dirname+'/../proc/proc_forget');
var proc_setting = require(__dirname+'/../proc/proc_setting');
var formidable = require('formidable');
var fs = require('fs');
var path = require('path');
var validator = require('validator');


var updateUser = function(req,res,next,param,paramSQL){
	console.log("UPDATE USER BRO");
	if(typeof param.username!=="username" && param.username!=="" && !validator.isEmail(param.username)){
		tools_api.error422(req,res,lang.profile.b);
		return;
	}
	if(typeof param.id_user==="undefined"||param.id_user===""||parseInt(param.id_user)===0){
		tools_api.incompleteParameter(req,res);
		return;
	}
	tools_db.oneOrNone("UPDATE table_user SET "+paramSQL.join(", ")+" WHERE id=${id_user} RETURNING id,username,avatar,id_role",param,function(data){
		console.log('A');
		var is_self = false;
		console.log('B');
		if(parseInt(data.id)===parseInt(req.token_access.id)){
			console.log('D');
			is_self = true;
		}
		console.log('E');
		// console.log(JSON.stringify(config.description));
		// console.log("OOOOOK"+config.description.role[config.dynamic.role[data.id_role]]);
		tools_api.ok200(res,{user:{is_self:is_self,id:data.id,username:data.username,avatar:data.avatar}});
	},function(err){
		tools_api.error422(req,res,lang.generic.b);
	});
};

var updateUsername = function(req,res,next){
	tools_db.oneOrNone("SELECT password FROM table_user WHERE id=$1",req.token_access.id,function(data){
		if(data.password === tools_all.md5(req.body.password_old)){
			//SAMA
			tools_db.oneOrNone("UPDATE table_user SET username=${username}, time_update=NOW() WHERE id=${id_user} RETURNING username",{id_user:req.token_access.id,username:req.body.username},function(data){
				tools_api.ok200(res,{username:data.username});
			},function(err){
				tools_api.error422(req,res,lang.profile.a);
			});
		}else{
			tools_api.error422(req,res,lang.auth.a);
		}
	},function(err){
		tools_api.error422(req,res,lang.profile.a);
	})
};

var createUser = function(req,res,next,param){
	if(typeof param.avatar === "undefined" || param.avatar === ""){
		param.avatar = tools_cms.param_jade(req).getFullPath()+"/images/avatar.png";
	}
	if(typeof param.name === "undefined") param.name = param.username;
	if(!validator.isEmail(param.username)){
		tools_api.error422(res,["Please input correct username"]);
		return;
	}
	// param.id_role = config.dynamic.role.admin;
	param.id_role = req.token_access.role;
	tools_db.one("\n\
		INSERT INTO \n\
		table_user \n\
		(username,password,token_access,token_session,is_active,id_role,avatar,name) \n\
		VALUES \n\
		(${username},MD5(${password}),'','',${is_active},${id_role},${avatar},${name}) RETURNING id",param,function(user){
			param.id_user = user.id;
			if(config.dynamic.role[req.token_access.role]==='admin'){
				tools_api.success200(res);
				return;
			}
			tools_db.one('SELECT id_project FROM mapping_company_admin_to_project WHERE id_user=$1',req.token_access.id,function(mapping){
				param.id_project = mapping.id_project;
				tools_db.one('INSERT INTO mapping_company_admin_to_project (id_user,id_project) VALUES (${id_user},${id_project}) RETURNING id',param,function(data){
					tools_api.success200(res);
				},function(err){
					tools_api.error422(req,res,lang.profile.d);
				});
			},function(err){
				tools_api.error422(req,res,lang.profile.d);
			});
		
	},function(err){
		tools_api.error422(req,res,lang.profile.d);
	});
};

var updatePassword = function(req,res,next){
	tools_db.oneOrNone("SELECT password FROM table_user WHERE id=$1",req.token_access.id,function(data){
		if(data.password === tools_all.md5(req.body.password_old)){
			//SAMA
			tools_db.oneOrNone("UPDATE table_user SET password=md5(${password_new}), time_update=NOW() WHERE id=${id_user} RETURNING username",{id_user:req.token_access.id,password_new:req.body.password_new},function(data){
				tools_api.ok200(res,{username:data.username});
			},function(err){
				tools_api.error422(req,res,lang.profile.a);
			});
		}else{
			tools_api.error422(req,res,lang.auth.a);
		}
	},function(err){
		tools_api.error422(req,res,lang.profile.a);
	});
};

var updateAvatar = function(req,res,next){
	tools_db.oneOrNone("SELECT password FROM table_user WHERE id=$1",req.token_access.id,function(data){
		console.log('A');
		if(data.password === tools_all.md5(req.body.password_old)){
			//SAMA
			console.log('B');
			var avatar = req.body.avatar;
			console.log('D');
			tools_db.oneOrNone("UPDATE table_user SET avatar=${avatar}, time_update=NOW() WHERE id=${id_user} RETURNING avatar",{id_user:req.token_access.id,avatar:avatar},function(data){
				tools_api.ok200(res,{avatar:data.avatar});
			},function(err){
				tools_api.error422(req,res,lang.profile.a);
			});
		}else{
			tools_api.error422(req,res,lang.auth.a);
		}
	},function(err){
		tools_api.error422(req,res,lang.profile.a);
	});
};

router.hook('patch','/pin',['admin'],['pin','id_user'],function(req,res,role,next){
	var param = req.query;
	tools_db.one('UPDATE table_user SET pin=MD5(${pin}) WHERE id=${id_user} RETURNING id,name,username,id_role',param,function(user){
		var img = "tm_red.png";
		var userrole = config.dynamic.role[""+user.id_role];
		if(userrole==='seller') img = "tm_green.png";
		tools_email.logSend(req.app,[user.username],'Change PIN of TM','template_email_pin_change','pin_change',{
			attachments:[
				{
					fileName:'tunjukmaterial.png',
					filePath: __dirname+"/../public/images/"+img,
					cid: 'tmpicture'
				}
			],
			name: user.name,
			support:{
				phone: config.setting.support_phone,
				email: config.setting.support_email,
				operationaltime: config.setting.support_operationaltime
			}
		});
		tools_api.success200(res);
	},function(err){
		tools_api.error422(req,res,lang.generic.b);
	});
});

router.hook('patch','/:id_user',['admin'],[],function(req,res,role,next){
	var param = req.params;
	tools_db.one('UPDATE table_user SET is_active=TRUE WHERE id=${id_user} RETURNING id',param,function(user){
		tools_api.success200(res);
	},function(err){
		tools_api.error422(req,res,lang.generic.b);
	});
});

router.hook('patch','/switch/:id_user',['admin'],[],function(req,res,role,next){
	var param = req.params;
	tools_db.one('UPDATE table_user SET is_active=NOT is_active WHERE id=${id_user} RETURNING id',param,function(user){
		tools_api.success200(res);
	},function(err){
		tools_api.error422(req,res,lang.generic.b);
	});
});

router.hook('patch','/',['admin'],['id_user','username'],function(req,res,role,next){
	var param = req.query;
	tools_db.one('UPDATE table_user SET username=${username} WHERE id=${id_user} RETURNING id',param,function(user){
		tools_api.success200(res);
	},function(err){
		tools_api.error422(req,res,lang.generic.b);
	});
});

router.hook('delete','/permanent',['admin'],['id_user'],function(req,res,role,next){
	var param = req.query;
	tools_db.one('DELETE FROM table_user WHERE id=${id_user} RETURNING id',param,function(user){
		tools_api.success200(res);
	},function(err){
		tools_api.error422(req,res,lang.generic.b);
	});
});

router.hook('delete','/:id_user',['admin'],[],function(req,res,role,next){
	var param = req.params;
	tools_db.one('UPDATE table_user SET is_active=FALSE WHERE id=${id_user} RETURNING id',param,function(user){
		tools_api.success200(res);
	},function(err){
		tools_api.error422(req,res,profile.a);
	});
});

router.hook('put','/',['admin'],['username'],function(req,res,role,next){
	var param = req.query;
	param.id_user = req.token_access.id;
	param.id_role = config.dynamic.role.user;
	param.avatar = tools_cms.param_jade(req).getFullPath()+"/images/avatar.png";
	tools_db.one('SELECT id_project FROM mapping_company_admin_to_project WHERE id_user=${id_user}',param,function(mapping){
		param.id_project = mapping.id_project;
		tools_db.one('INSERT INTO table_user (username,id_project,id_role,avatar) VALUES (${username},${id_project},${id_role},${avatar}) RETURNING id',param,function(data){
			tools_api.success200(res);
		},function(err){
			tools_api.error422(req,res,lang.generic.b);
		});
	},function(err){
		tools_api.error422(req,res,lang.generic.a);
	});
});

router.hook('delete','/',['admin'],['id_user'],function(req,res,role,next){
	var param = req.query;
	tools_db.one('UPDATE table_user SET is_active= NOT is_active WHERE id=${id_user} RETURNING id',param,function(data){
		tools_api.success200(res);
	},function(err){
		tools_api.error422(req,res,lang.generic.b);
	});
});

router.hook('get','/admin',['admin'],[],function(req,res,role,next){
	var param = req.query;
	var id_user = req.token_access.id;
	if(typeof param.id_user!=='undefined' && param.id_user!==''&&parseInt(param.id_user)!==0&&param.id_user!==""){
		id_user = param.id_user;
	}
	tools_db.oneOrNone("\n\
			SELECT \n\
			to_char(usertable.time_update,'Mon, DD YYYY HH24:MI:SS') AS time_update1,\n\
			to_char(usertable.time_create,'Mon, DD YYYY HH24:MI:SS') AS time_create1,\n\
			usertable.time_update, \n\
			usertable.time_create, \n\
			usertable.username, \n\
			userrole.code AS role_code, \n\
			userrole.description AS role_description,\n\
			usertable.avatar,\n\
			usertable.username,\n\
			usertable.id_role,\n\
			usertable.is_active \n\
			FROM table_user usertable \n\
			LEFT JOIN constant_role userrole ON userrole.id=usertable.id_role \n\
			WHERE usertable.id=$1",id_user,function(data){
			tools_api.ok200(res,{user:data});
		},function(err){
			tools_api.error422(req,res,lang.generic.a);
		});
});

router.hook('get','/',['admin'],[],function(req,res,role,next){
	var param = {id_user:req.token_access.id};
	var role = config.dynamic.role[req.token_access.role];
	tools_db.one('SELECT id_project FROM mapping_company_admin_to_project WHERE id_user=${id_user}',param,function(mapping){
		var id_project = mapping.id_project;
		tools_cms.tableSupport(req,res,"\n\
			SELECT raw.* FROM (\n\
				SELECT COALESCE(cntall.trx_all,0) AS trx_all, COALESCE(cntall.omzet_all,0) AS omzet_all, COALESCE(cnt.trx_month,0) AS trx_month,COALESCE(cnt.omzet_month,0) AS omzet_month,usr.name,usr.id,usr.username,usr.avatar,to_char(usr.time_create,'YYYY-MM-DD') AS time_create,to_char(usr.time_update,'YYYY-MM-DD') AS time_update,usr.is_active \n\
				FROM table_user usr \n\
				LEFT JOIN (SELECT SUM(qty) trx_month,SUM(sold_price) omzet_month,id_user FROM table_sales WHERE to_char(time_create,'YYYY-MM')=to_char(NOW(),'YYYY-MM') GROUP BY id_user) cnt ON cnt.id_user=usr.id\n\
				LEFT JOIN (SELECT SUM(qty) trx_all,SUM(sold_price) omzet_all,id_user FROM table_sales GROUP BY id_user) cntall ON cntall.id_user=usr.id\n\
				WHERE usr.id_project="+id_project+" AND id_role="+config.dynamic.role.user+"\n\
			) raw",
			["raw.username","raw.name","raw.is_active::text"],
			"raw.id ASC",function(row){
				var action = "<a href='#editData' onclick='editData("+row.id+");'><span class='glyphicon glyphicon-pencil'/></a>&nbsp;&nbsp;&nbsp;";
				if(row.is_active) action += "<a href='#deleteData' onclick='deleteData("+row.id+");'><span class='glyphicon glyphicon-remove'/></a>";
				else action += "<a href='#activateData' onclick='activateData("+row.id+");'><span class='glyphicon glyphicon-ok'/></a>";
				if(role==='company_admin'){
					return [
						row.no,
						"<img style='width: 33px; height: 33px;' src='"+row.avatar+"'/>&nbsp;&nbsp;&nbsp;"+row.username,
						row.time_create,
						row.time_update,
						"<a href='#switchData' onclick='switchData("+row.id+");'>"+row.is_active+"</a>",
						"<div align='right'>"+parseInt(row.trx_month).formatMoney(0)+"<br>"+parseInt(row.trx_all).formatMoney(0)+"</div>",
						"<div align='right'>"+parseInt(row.omzet_month).formatMoney(0)+"<br>"+parseInt(row.omzet_all).formatMoney(0)+"</div>",
						action
					];
				}else{
					return [
						row.no,
						"<img style='width: 33px; height: 33px;' src='"+row.avatar+"'/>&nbsp;&nbsp;&nbsp;"+row.username,
						row.time_create,
						row.time_update,
						"<a href='#switchData' onclick='switchData("+row.id+");'>"+row.is_active+"</a>",
						"<div align='right'>"+parseInt(row.trx_month).formatMoney(0)+"<br>"+parseInt(row.trx_all).formatMoney(0)+"</div>",
						action
					];
				}
			});
	},function(err){
		tools_api.error422(req,res,lang.generic.a);
	});	
});

router.hook('get','/profile',['admin'],['id_user'],function(req,res,role,next){
	var param = req.query;
	tools_db.one('SELECT id,COALESCE(name,\'-\') AS name,username,avatar,is_active FROM table_user WHERE id=${id_user}',param,function(user){
		tools_api.ok200(res,{user:user});
	},function(err){
		tools_api.error422(req,res,lang.generic.a);
	});
});

router.hook('get','/detail/sessions/:id_user/:id_session',['admin'],[],function(req,res,role,next){
	var iteration = 0;
	var query = 3;
	var print = {};
	var pool = function(){
		iteration++;
		if(iteration>=query){
			tools_api.ok200(res,print);
		}
	}
	var param=req.params;
	tools_db.manyOrNone('SELECT to_char(pool.time_create,\'Mon, DD YYYY HH24:MI\') AS time_create,ST_Y(pool.geom_location) AS lat,ST_X(pool.geom_location) AS lng FROM table_pool_gps pool WHERE id_user=${id_user} AND id_session=${id_session} ORDER BY id ASC',param,function(data){
		print.path = data;
		pool();
	},function(err){
		tools_api.error422(req,res,lang.generic.a);
	});
	tools_db.manyOrNone('SELECT product.unit,det.qty,det.sold_price,COALESCE(product.name,\'-\') AS name, to_char(sales.time_create,\'Mon, DD YYYY HH24:MI\') AS time_create, ST_Y(sales.geom_location) AS lat,ST_X(sales.geom_location) AS lng FROM table_sales_session sales LEFT JOIN table_sales det ON det.id_session=sales.id LEFT JOIN table_product product ON product.id=det.id_product WHERE sales.id_session=${id_session}',param,function(data){
		print.sales = data;
		pool();
	},function(err){
		tools_api.error422(req,res,lang.generic.a);
	});
	tools_db.manyOrNone('SELECT to_char(time_create,\'Mon, DD YYYY HH24:MI\') AS time_create,remark, ST_Y(geom_location) AS lat,ST_X(geom_location) AS lng FROM table_tag WHERE id_session=${id_session}',param,function(data){
		print.tag = data;
		pool();
	},function(err){
		tools_api.error422(req,res,lang.generic.a);
	});
});

router.hook('get','/today',['admin'],[],function(req,res,role,next){
	var param={
		id_user: req.token_access.id
	};
	tools_cms.tableSupport(req,res,"\n\
		SELECT raw.* FROM (\n\
			SELECT \n\
			usr.id, usr.username, usr.avatar,ttag.time_create, to_char(ttag.time_create,'YYYY-MM-DD HH24:MI:SS') AS time_create_string, usr.name,tp.name AS location \n\
			FROM table_user usr\n\
			LEFT JOIN (SELECT id_project FROM mapping_company_admin_to_project WHERE id_user="+param.id_user+") mp ON mp.id_project=usr.id_project\n\
			LEFT JOIN (SELECT MIN(id) AS id,id_user FROM table_tag WHERE time_create::date=NOW()::date GROUP BY id_user) tt ON tt.id_user=usr.id\n\
			LEFT JOIN table_tag ttag ON ttag.id=tt.id\n\
			LEFT JOIN table_point tp ON tp.id=ttag.id_location\n\
			WHERE tt.id IS NOT NULL AND mp.id_project IS NOT NULL\n\
		) raw",
		["raw.username","raw.name"],
		"raw.time_create DESC",function(row){
			return [
				row.no,
				row.username,
				row.name,
				row.location,
				row.time_create_string,
			]
		});
});

router.hook('get','/detail/sessions/:id_user',['admin'],[],function(req,res,role,next){
	var param=req.params;
	tools_cms.tableSupport(req,res,"\n\
		SELECT raw.* FROM (SELECT COALESCE(tag.cnt_tag,0) AS cnt_tag,COALESCE(sales.cnt_sales,0) AS cnt_sales,ses.id,COALESCE(to_char(ses.time_create,'Mon, DD YYYY HH24:MI'),'-') AS time_create,COALESCE(to_char(locdata.time_create,'Mon, DD YYYY HH24:MI'),'-') AS time_last FROM table_pool_gps_session ses LEFT JOIN (SELECT MAX(id) maxid, id_session FROM table_pool_gps GROUP BY id_session) pgps ON pgps.id_session=ses.id LEFT JOIN table_pool_gps locdata ON locdata.id=pgps.maxid LEFT JOIN (SELECT COUNT(id) as cnt_tag, id_session FROM table_tag GROUP BY id_session) tag ON tag.id_session=ses.id LEFT JOIN (SELECT COUNT(id) AS cnt_sales,id_session FROM table_sales_session GROUP BY id_session) sales ON sales.id_session=ses.id WHERE ses.id_user="+param.id_user+") raw",
		["raw.id::text"],
		"raw.id DESC",function(row){
			return [
				row.no,
				"<div class='product-info'>\n\
					<a class='product-title' href='#getSession' onclick='getSession("+row.id+");'>Session "+row.id+"</a><br>\n\
					<span class='product-description'>"+row.time_create+" to "+row.time_last+"</span><br>\n\
					<span class='product-description'>"+row.cnt_sales+" sales & "+row.cnt_tag+" tags</span>\n\
				</div>"
			]
		});
});


router.hook('get','/:id_user',['admin'],[],function(req,res,role,next){
	var param = req.params;	
	tools_db.one('SELECT * FROM table_user WHERE id=${id_user}',param,function(data){
		tools_api.ok200(res,{user:data});
	},function(err){
		tools_api.error422(req,res,lang.generic.a);
	});
});

router.hook('post','/',['admin'],[],function(req,res,role,next){
	var paramSQL = [];
	paramSQL.push("time_update=NOW()");
	var param = req.body;
	console.log('PREUPDATE USER');
	if(typeof param.password_old==="undefined" || param.password_old===""){
		var form = new formidable.IncomingForm();
		form.multiples = false;
	  	form.hash = "md5";
		form.uploadDir = path.join(__dirname, '/../public/uploads');
		form.on('file', function(field, file) {
			console.log('PREFILE');
			// param[field] = name;
			var arrayFile = file.name.split(".");
			var ext = arrayFile[arrayFile.length-1];
			var newFile = (new Date()).getTime()+file.hash+"."+ext;
			console.log("FILE "+field+";"+newFile);
			param[field]=tools_cms.param_jade(req).getFullPath()+"/uploads/"+newFile;
			paramSQL.push("avatar=${avatar}");
			fs.rename(file.path, path.join(form.uploadDir, newFile));
		});
		form.on('field', function(field, value) {
			console.log('PREFIELD');
			param[field] = value;
			if(field==="id_user"){ 
				//Do Nothing 
			} else if(field==="password"&&value==="#######"){
				//DO Nothing
			}
			else if(field==="password") paramSQL.push("password=MD5(${password})");
			else if(field==="is_active"){
				param.is_active = value == "true";
				paramSQL.push(field+"=${"+field+"}");
			}
			else if(field === "is_create"){
				param.is_create = value == "true";
			}
			else paramSQL.push(field+"=${"+field+"}");
			console.log("FIELD "+field+";"+value);
			// fs.rename(file.path, path.join(form.uploadDir, newFile));
		});
		form.on('error', function(err) {
			console.log('PREERROR');
		    console.log('An error has occured: \n' + err);
		    tools_api.error422(res,[err.toString()]);
		});
		form.on('end',function(){
			console.log("PREEND");
			// param.id_role = config.dynamic.role.admin;
			param.id_role = req.token_access.role;
			console.log('PARAM.id_role '+param.id_role+";"+JSON.stringify(req.token_access));
			if(typeof param.id_role!=="undefined" && param.id_role!=="" && parseInt(param.id_role)!==0 && typeof param.is_active!=="undefined" && param.is_active!==""){				
				if(param.is_create) createUser(req,res,next,param);
				else updateUser(req,res,next,param,paramSQL);
			}else{
				tools_api.incompleteParameter(req,res);
			}
		});
		console.log('PREFORMPARSE');
		form.parse(req);
		return;
	}
	if(typeof param.username !=="undefined" && param.username!==""){
		if(!validator.isEmail(param.username)){
			tools_api.error422(res,["Please input correct username"]);
			return;
		}
		updateUsername(req,res,next);
	}else if(typeof param.password_new !=="undefined" && param.password_new!==""){
		updatePassword(req,res,next);
	}else if(typeof param.avatar !=="undefined" && param.avatar!==""){
		updateAvatar(req,res,next);
	}else{
		tools_api.incompleteParameter(req,res);
	}
});




module.exports = router.router;
