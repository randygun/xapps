var express = require('express');
var router = express.Router();
var tools_api = require(__dirname+'/../tools/tools_api');
var tools_cms = require(__dirname+'/../tools/tools_cms');
var tools_db = require(__dirname+'/../tools/tools_db');
var tools_all = require(__dirname+'/../tools/tools_all');
var login = require(__dirname+"/../proc/proc_login");
var config = require(__dirname+"/../config");

/* GET home page. */
router.get('/', function(req, res, next) {
	var data = req.query.data;
	if(typeof data==="undefined"||data===""){
	  	renderView(req,res);
	}else{
		var dataObj = JSON.parse(new Buffer(data, 'base64').toString('ascii'));
		var errors = dataObj.err;
		var ok = dataObj.ok;
		renderView(req,res,errors,ok);
	}
});

var renderView = function(req,res,errors,ok){
	var param_jade = tools_cms.param_jade(req);
	console.log(JSON.stringify(param_jade));
	res.render('cms_login', { param_jade: param_jade, title: 'Login',errors:errors,ok:ok});
}

router.post('/', function(req, res, next) {
	console.log("PARAMETER LOGIN: "+req.body.email+";"+req.body.password);
	//VALIDATION OF USERNAME PASSWORD HERE
  	// res.render('login', { title: 'Login',errors:"COBA ERRORS"});
  	// tools.redirectTemporary(res,"home",req);
  	var param = {
  		email: req.body.email,
  		role: config.dynamic.role.admin
  	};
  	tools_db.oneOrNone('SELECT * FROM table_user WHERE username=${email} AND id_role=${role}',param,function(data){
  		if(data.avatar===null) data.avatar = tools_cms.param_jade(req).getFullPath()+"/img/avatar.png";
  		if(data===null){
			console.log("data == null");
			renderView(req,res,"Username not found");
  		}else{
  			if(data.password===tools_all.md5(req.body.password)){
	        	console.log("Password SAME");
				data.token_access = tools_api.genTokenAccess(data,req);
				data.token_session = tools_api.genTokenSession(data);
	        	//RENEW TOKEN
	        	tools_db.oneOrNone("UPDATE table_user SET token_access=${token_access}, token_session=${token_session}, time_update=NOW() WHERE id=${id} RETURNING username,id_role",data,function(result){
	        		console.log("OK");
	        		tools_all.saveCookies(res,{
	        			username:data.username,
	        			avatar:data.avatar,
	        			token_access:data.token_access,
	        			token_session:data.token_session
	        		});
	        		console.log("OK");
					tools_api.redirectTemporary(res,"/home",req);
	        	},function(err){
	        		renderView(req,res,"Unable update security credentials");
	        	});	        	
	        }else{
		        console.log("PASS INCORRECT: CORRECT PASSWORD: "+data.password+";"+tools_all.md5(req.body.password));
		        renderView(req,res,"Incorrect username / password"+tools_all.md5("material2018"));
	        }
  		}
  	},function(err){
  		renderView(req,res,"Unable to login");
  	});
});

module.exports = router;
