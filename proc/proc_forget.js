module.exports = this;
var instance = this;
var tools_api = require(__dirname+"/../tools/tools_api");
var tools_db = require(__dirname+"/../tools/tools_db");
var tools_all = require(__dirname+"/../tools/tools_all");
var tools_email = require(__dirname+"/../tools/tools_email");
var tools_cms = require(__dirname+"/../tools/tools_cms");
var config = require(__dirname+"/../config");
var lang = require(__dirname+"/../language");
var proc_login = require(__dirname+'/proc_login');
this.randomize = function(req, res){
	var param = req.body;
	tools_db.one('UPDATE table_user SET auth_forgetpassword=((random()*1000000)::bigint) WHERE username=${email} RETURNING auth_forgetpassword,username,name',param,function(user){
		var protocol = req.protocol;
		var host = req.get('host');
		console.log("Obtain host "+host);
		var missing_path = "";

		if(typeof req.get("missing_path") !=="undefined"){
			missing_path = req.get("missing_path");
			host = req.get("missing_host");
			protocol = req.get("missing_protocol");
		}
		tools_email.send([param.email],'Reset Password Aplikasi '+config.app.complete,'template_email_forgetpassword_fromtools',{
			authcode:user.auth_forgetpassword,
			name:user.name,
			attachments:[
				{
					fileName:'tunjukmaterial.png',
					filePath: __dirname+"/../public/images/tm_red.png",
					cid: 'tmpicture'
				}
			],
			support:{
				phone: config.setting.support_phone,
				email: config.setting.support_email,
				operationaltime: config.setting.support_operationaltime
			},
			href: tools_cms.param_jade(req).getFullPath()+"/forgetpassword?email="+param.email+"&authcode="+user.auth_forgetpassword
		});
		// href: protocol+"://"+host+missing_path+"/forgetpassword?email="+param.email+"&authcode="+user.auth_forgetpassword
		tools_api.success200(res);
	},function(err){
		tools_api.error422(req,res,lang.forgetpassword.a);
	});
};

this.challenge = function(req, res){
	var param = req.body;
	param.username = param.email;
	tools_db.one('SELECT id,auth_forgetpassword FROM table_user WHERE username=${email}',param,function(user){
		param.id = user.id;
		if(parseInt(user.auth_forgetpassword)===parseInt(param.authcode)){
			tools_db.one('UPDATE table_user SET password=MD5(${password}),auth_forgetpassword=NULL WHERE id=${id} RETURNING id',param,function(data){
				proc_login.login(req,res);
			},function(err){
				tools_api.error422(req,res,lang.forgetpassword.a);
			});
		}else{
			tools_api.error422(req,res,lang.forgetpassword.c);
		}
	},function(err){
		tools_api.error422(req,res,lang.forgetpassword.b);
	});
};