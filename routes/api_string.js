var tools_routes = require(__dirname+"/../tools/tools_routes");
var tools_api = require(__dirname+"/../tools/tools_api");
var tools_cms = require(__dirname+"/../tools/tools_cms");
var tools_db = require(__dirname+"/../tools/tools_db");
var tools_all = require(__dirname+"/../tools/tools_all");
var tools_email = require(__dirname+"/../tools/tools_email");
var config = require(__dirname+"/../config");
var lang = require(__dirname+"/../language");
var proc_login = require(__dirname+'/../proc/proc_login');
var proc_forget = require(__dirname+'/../proc/proc_forget');
var router = tools_routes.init();

var formidable = require('formidable');
var fs = require('fs');
var path = require('path');
var validator = require('validator');

var proc = require(__dirname+'/../proc/proc_login');
router.hook('post',"/faq/:user_role",['admin'],[],function(req,res,role,next){
	// var param = req.body;
	// tools_db.one('INSERT INTO table_string_faq (content) VALUES (${value}) RETURNING id',param,function(data){
	// 	tools_api.success200(res);
	// },function(err){
	// 	tools_api.error422(req,res,lang.generic.b);
	// });
	var param = {};
	param.user_role = req.params.user_role;
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
		fs.rename(file.path, path.join(form.uploadDir, newFile));
	});
	form.on('field', function(field, value) {
		console.log('PREFIELD');
	});
	form.on('error', function(err) {
		console.log('PREERROR');
	    console.log('An error has occured: \n' + err);
	    tools_api.error422(req,res,lang.generic.b);
	});
	form.on('end',function(){
		console.log("PREEND");
		var tulis = function(){
			tools_db.one('INSERT INTO table_string_faq (content_seller,content_buyer) VALUES (${faq_seller},${faq_buyer}) RETURNING id',param,function(data){
				tools_api.success200(res);
			},function(err){
				tools_api.error422(req,res,lang.generic.b);
			});
		};
		tools_db.one('SELECT * FROM table_string_faq ORDER BY id DESC LIMIT 1',undefined,function(data){
			param.faq_buyer = data.content_buyer;
			param.faq_seller = data.content_seller;
			var key = "faq_"+param.user_role;
			param[key] = param.faq;
			tulis();
		},function(err){
			param.faq_buyer = null;
			param.faq_seller = null;
			var key = "faq_"+param.user_role;
			param[key] = param.faq;
			tulis();
		});
	});
	console.log('PREFORMPARSE');
	form.parse(req);
	return;
});
router.hook("get","/faq",[],[],function(req,res,role,next){
	tools_db.one('SELECT faq.* FROM table_string_faq faq LEFT JOIN (SELECT MAX(id) AS id FROM table_string_faq) maxfaq ON maxfaq.id=faq.id WHERE maxfaq.id IS NOT NULL',undefined,function(faq){
		if(config.dynamic.role[req.token_access.role]==='seller') faq.content = faq.content_seller;
		else faq.content = faq.content_buyer;
		tools_api.ok200(res,{faq:faq});
	},function(err){
		tools_api.error422(req,res,lang.faq.a);
	});
});
router.hook('post',"/tos",['admin'],['value'],function(req,res,role,next){
	var param = req.body;
	tools_db.one('INSERT INTO table_string_tos (content) VALUES (${value}) RETURNING id',param,function(data){
		tools_api.success200(res);
	},function(err){
		tools_api.error422(req,res,lang.generic.b);
	});
});
router.hook("get","/tos",[],[],function(req,res,role,next){
	tools_db.one('SELECT tos.* FROM table_string_tos tos LEFT JOIN (SELECT MAX(id) AS id FROM table_string_tos) maxtos ON maxtos.id=tos.id WHERE maxtos.id IS NOT NULL',undefined,function(tos){
		tools_api.ok200(res,{tos:tos});
	},function(err){
		tools_api.error422(req,res,lang.tos.a);
	});
});
router.hook('post',"/help/:user_role",['admin'],[],function(req,res,role,next){
	// var param = req.body;
	// tools_db.one('INSERT INTO table_string_help (content) VALUES (${value}) RETURNING id',param,function(data){
	// 	tools_api.success200(res);
	// },function(err){
	// 	tools_api.error422(req,res,lang.generic.b);
	// });
	var param = {};
	param.user_role = req.params.user_role;
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
		fs.rename(file.path, path.join(form.uploadDir, newFile));
	});
	form.on('field', function(field, value) {
		console.log('PREFIELD');
	});
	form.on('error', function(err) {
		console.log('PREERROR');
	    console.log('An error has occured: \n' + err);
	    tools_api.error422(req,res,lang.generic.b);
	});
	form.on('end',function(){
		console.log("PREEND");
		var tulis = function(){
			tools_db.one('INSERT INTO table_string_help (content_seller,content_buyer) VALUES (${help_seller},${help_buyer}) RETURNING id',param,function(data){
				tools_api.success200(res);
			},function(err){
				tools_api.error422(req,res,lang.generic.b);
			});
		};
		tools_db.one('SELECT * FROM table_string_help ORDER BY id DESC LIMIT 1',undefined,function(data){
			param.help_buyer = data.content_buyer;
			param.help_seller = data.content_seller;
			var key = "help_"+param.user_role;
			param[key] = param.help;
			tulis();
		},function(err){
			param.help_buyer = null;
			param.help_seller = null;
			var key = "help_"+param.user_role;
			param[key] = param.help;
			tulis();
		});
	});
	console.log('PREFORMPARSE');
	form.parse(req);
	return;
});
router.hook("get","/help",[],[],function(req,res,role,next){
	tools_db.one('SELECT help.* FROM table_string_help help LEFT JOIN (SELECT MAX(id) AS id FROM table_string_help) maxhelp ON maxhelp.id=help.id WHERE maxhelp.id IS NOT NULL',undefined,function(help){
		if(config.dynamic.role[req.token_access.role]==='seller') help.content = help.content_seller;
		else help.content = help.content_buyer;
		tools_api.ok200(res,{help:help});
	},function(err){
		tools_api.error422(req,res,lang.help.a);
	});
});

module.exports = router.router;