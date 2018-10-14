var express = require('express');
var router = express.Router();
var config = require(__dirname+"/../config");
var tools_all = require(__dirname+'/../tools/tools_all');
var tools_api = require(__dirname+'/../tools/tools_api');
var tools_cms = require(__dirname+'/../tools/tools_cms');

/* GET home page. */
router.all('/*', function(req, res, next) {
	console.log("Cluster worker id CMS: "+config.cluster.worker.id);
	console.log('CMS req.path '+req.path+";"+req.originalUrl);
	console.log(JSON.stringify(req.token_access));
	var cookies = tools_all.getCookies(req);
	var originalUrl = req.originalUrl.split('?')[0];
	if(originalUrl[originalUrl.length-1]==='/')originalUrl = originalUrl.substring(0, originalUrl.length - 1);
	if(
		originalUrl==='/undefined'||
		originalUrl.indexOf('/api')!==0&&(
			(typeof cookies==='undefined' && typeof config.path.free[originalUrl]==='undefined' && typeof config.path.free[originalUrl.replace(/[0-9]/g,'')]==='undefined')||
			(typeof config.path.free[originalUrl]!=='undefined'&&config.path.free[originalUrl].indexOf(req.method)===-1)||
			(typeof config.path.free[originalUrl.replace(/[0-9]/g,'')]!=='undefined'&&config.path.free[originalUrl.replace(/[0-9]/g,'')].indexOf(req.method)===-1)
		)
	){
		//LEMPAR LOGIN DONK
		console.log("CHECKING REQ PARAMS :"+originalUrl.replace(/[0-9]/g,''));
		res.writeHead(302,{'Location':tools_cms.param_jade(req).getFullPath()+'/login'});
		res.end();
		return;
	}else{
		if(typeof cookies!=='undefined'){
			console.log('DIISI');
			req.cookies = cookies;
			if(typeof cookies.token_access!=='undefined'){
				var token = tools_api.RSA.decrypt(cookies.token_access);
				req.token_access = token;
			}
		}
	}
	var date = new Date();
	var now = date.getTime();
	req.TAG_START = now;
	req.TAG = tools_all.randomString(4,'0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ');
	if(req.originalUrl==='/'){
		res.writeHead(302,{'Location':'home'});
		res.end();		
	}else next();
  	// res.render('index', { title: 'Express '+config.cluster.worker.id });
});

module.exports = router;
