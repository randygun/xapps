var tools_routes = require(__dirname+"/../tools/tools_routes");
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

router.hook("post","/",[],[],function(req,res,role,next){
	var cookies = tools_all.getCookies(req);
	if(typeof cookies!=="undefined"){
		console.log("COOKIES "+JSON.stringify(cookies));
	}else{
		console.log("COOKIES NOT AVAILABLE");
		cookies = {};
	}
	var param = req.body;
	console.log(JSON.stringify(param));
	if(typeof req.token_access === "undefined" || typeof param.token_session==="undefined" || param.token_session==="" ){
		tools_api.error401(res);
		return;
	}
	tools_db.one("SELECT token_session,id_language FROM table_user WHERE id=$1",req.token_access.id,function(data){
		console.log("TOKEN SESSION \n"+data.token_session.trim()+"\n"+param.token_session.trim());
		if(data.token_session.trim()===param.token_session.trim()){
			req.token_session = tools_api.RSA.decrypt(data.token_session);
			req.token_access.lang = data.id_language;
			var token = tools_api.genTokenRenew(req);
			token.id_user = req.token_access.id;
			// tools.cluster.worker.send({ concurrent:-1, path:req.path });
			tools_db.one("UPDATE table_user SET token_session=${token_session}, token_access=${token_access} WHERE id=${id_user} RETURNING token_session,token_access",token,function(data){
				delete token.id_user;
				cookies.token_access = token.token_access;
				cookies.token_session = token.token_session;
				tools_all.saveCookies(res,cookies);
				tools_api.ok200(res,{token:token});
				console.log("API END token renew "+req.path);
			},function(err){
				console.log("Unable update token");
				tools_api.error401(res);
				// tools.error422(res,["Unable update token"]);
			});
		}else{
			tools_api.error401(res);
		}
	},function(err){
		console.log("Unable query old token");
		tools_api.error401(res);
	});
});

module.exports = router.router;