var express = require('express');
var router = express.Router();
var config = require(__dirname+"/../config");
var tools_all = require(__dirname+"/../tools/tools_all");
var tools_api = require(__dirname+"/../tools/tools_api");
var tools_db = require(__dirname+"/../tools/tools_db");

/* GET home page. */
router.all('/*', function(req, res, next) {
	config.savedInstance.api += 1;
	res.on('finish',function(){
		console.log('CONCURRENT RES FINISH'+req.path+"=-1");
		config.savedInstance.api -= 1;
	});
	console.log("API Cluster worker id: "+config.cluster.worker.id);
  	// res.render('index', { title: 'Express '+config.cluster.worker.id });
  	var date = new Date();
	var now = date.getTime();
	req.TAG_START = now;
	req.TAG = tools_all.genRandom(4);
	console.log("REQUESTING PATH "+req.path+";"+req.method+";"+now);
	console.log("CHECKING API TOKEN "+req.get("Token-Access"));
	console.log("CHECKING API ROLE");
	try{
		req.token_access = tools_api.RSA.decrypt(req.get("Token-Access"));
		console.log("TOKEN_ACCESS:"+JSON.stringify(req.token_access));
		if(typeof req.token_access.id==="undefined"||typeof req.token_access.role==="undefined"||typeof req.token_access.exp==="undefined"||parseInt(req.token_access.id)===0||parseInt(req.token_access.role)===0){
			console.log("401KAN");
			tools_api.error401(res);
			return;
		}
		console.log("TOKEN ACCESS "+JSON.stringify(req.token_access)+"; TAG START "+req.TAG_START);
		//CHECK ROLE		
		if(req.token_access.exp<req.TAG_START){
			console.log("TOKEN EXPIRED");
			if(typeof config.path.lifetime[req.path]==="undefined" || config.path.lifetime[req.path]!==req.method){
				console.log("PAGE NOT IN EXPIRED TOKEN");
				tools_api.error403(res);
				return;
			}
		}
		console.log("TOKEN NOT EXPIRED OR TOKEN EXPIRED GRANTED:"+config.path.lifetime[req.path]+";"+req.method);
		//GRANTED
	}catch(err){
		//No Need token
		console.log("ERR API "+JSON.stringify(err));
		if(typeof config.path.free[req.path] === "undefined" || config.path.free[req.path] !== req.method){
			tools_api.error401(res);
			return;
		}
	}
	console.log("FORBIDA");
	if(typeof req.token_access !=='undefined' && typeof req.token_access.role !=='undefined'){

		var goNext = function(){
			var notifToken = req.get('Notif-Token');
			if(typeof notifToken!== 'undefined' && notifToken!== null && notifToken!== ''){
				tools_db.one('UPDATE table_device SET token_fcm=${token_fcm} WHERE id IN (SELECT id_device FROM table_user WHERE id=${id_user}) RETURNING id',{id_user: req.token_access.id,token_fcm: notifToken},function(success){
					res.header('Notif-Token', notifToken);
					next();
				},function(err){
					next();
				});
			}else{
				next();
			}
		};

		if (parseInt(req.token_access.role) === parseInt(config.dynamic.role.seller) || parseInt(req.token_access.role) === parseInt(config.dynamic.role.employee)){
			console.log("FORBIDB1");
			tools_db.one('SELECT (store.is_delete OR NOT usr.is_active) AS is_delete FROM table_user usr LEFT JOIN table_store store ON store.id=usr.id_store WHERE usr.id=$1',req.token_access.id,function(store){
				console.log("FORBID1: "+store.is_delete);
				if(store.is_delete) tools_api.error401(res);
				else goNext();
			},function(err){
				console.log("FORBIDD1");
				tools_api.error401(res);
			});
		}else if (parseInt(req.token_access.role) === parseInt(config.dynamic.role.buyer)){
			console.log("FORBIDB2");
			tools_db.one('SELECT usr.is_active FROM table_user usr WHERE usr.id=$1',req.token_access.id,function(usr){
				console.log("FORBID2: "+usr.is_active);
				if(!usr.is_active) tools_api.error401(res);
				else goNext();
			},function(err){
				console.log("FORBIDD2");
				tools_api.error401(res);
			});
		}else{
			goNext();
		}
	}else{
		console.log("FORBIDC");
		next();
	}
});

module.exports = router;
