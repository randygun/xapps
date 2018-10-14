//COMMENTTHISTOTEST
module.exports = this;

var fs = require('fs');
var express = require('express');
var tools_cms = require(__dirname+"/tools_cms");
var tools_api = require(__dirname+"/tools_api");
var tools_all = require(__dirname+"/tools_all");
var config = require(__dirname+"/../config");
var all_all = require(__dirname+"/../baseroutes/all_all");

var registerBaseRoutes = function(app){
	var filenames = fs.readdirSync(__dirname+"/../baseroutes");
	console.log(JSON.stringify(filenames));
	filenames.forEach(function(filename){
		if(filename.indexOf('api_')!==0&&filename.indexOf('cms_')!==0) return;
		var routes = require(__dirname+'/../baseroutes/'+filename);
		var path = filename.split(".")[0].replace(/_/g,'/');
		if(path.indexOf('cms/')===0) path = path.substring(4,path.length);
		console.log('Registering '+path+': '+filename);
		app.use('/'+path, routes);
	});
};

this.register = function(app){
	// It is time to register root path first
	all_all.register(app);
	var filenames = fs.readdirSync(__dirname+"/../routes");
	console.log(JSON.stringify(filenames));
	filenames.forEach(function(filename){
		if(filename.indexOf('api_')!==0&&filename.indexOf('cms_')!==0) return;
		var routes = require(__dirname+'/../routes/'+filename);
		var path = filename.split(".")[0].replace(/_/g,'/');
		if(path.indexOf('cms/')===0) path = path.substring(4,path.length);
		console.log('Registering '+path+': '+filename);
		app.use('/'+path, routes);
	});
	registerBaseRoutes(app);
}

this.init = function(){
	var router = express.Router();
	return {
		hook: function(method,path,roles,expects,callback){
			console.log("APPLICATION:ROUTERHOOK: "+method+";"+path+";");
			router[method](path, function(req, res, next) {
				console.log("Cluster worker id ROUTER: "+config.cluster.worker.id);
				var is_err = false;
				var param;
				if(method==="post") param = req.body;
				else param = req.query;
				expects.forEach(function(row){
					console.log("CHECKING "+row);
					if(typeof param[row]==="undefined" || param[row]===""){
						is_err = true;
						console.log("DECISION TRUE");
						return;
					}
				});
				console.log("IS_ERR "+is_err);
				if(is_err) {
					tools_api.incompleteParameter(req,res);
					return;
				}
				var is_granted = false;
				var cookies = tools_all.getCookies(req);
				// if(typeof cookies==='undefined'){
				// 	// GA ADA COOKIES, LOGIN DONK
				// 	return;
				// }
				roles.forEach(function(role){
					console.log("CHECKING ROLE "+role+";"+JSON.stringify(config.dynamic.role)+";"+JSON.stringify(cookies)+";"+JSON.stringify(req.token_access));
					if(typeof req.token_access!=='undefined')console.log("for User "+config.dynamic.role[req.token_access.role]);
					if(typeof req.token_access!=='undefined' && role===config.dynamic.role[req.token_access.role]){
						is_granted = true;
						return;
					}
				});
				var role = undefined;
				console.log('ROLES:PRE:LENGTH:'+roles.length+":"+is_granted);
				if(parseInt(roles.length)===0) is_granted = true;
				console.log('ROLES:POST:LENGTH:'+roles.length+":"+is_granted);
				if(typeof req.token_access !== "undefined") role = config.dynamic.role[req.token_access.role];
				if(is_granted) {
					console.log('KESINIA:'+roles.length+":"+is_granted);
					callback(req, res, role, next);
				} else {
					console.log('KESINIB:'+roles.length+":"+is_granted);
					if(req.originalUrl.indexOf('/api')===0)tools_api.error401(res);
					else {
						res.writeHead(302,{'Location':tools_cms.param_jade(req).getFullPath()+'/login'});
						res.end();
					}
				}
			});
		},
		router:router
	};
}
