var express = require('express');
var router = express.Router();
var tools_api = require(__dirname+'/../tools/tools_api');
var tools_cms = require(__dirname+'/../tools/tools_cms');
var tools_db = require(__dirname+'/../tools/tools_db');
var tools_email = require(__dirname+'/../tools/tools_email');
var config = require(__dirname+'/../config');

var checkEmail = function(req,res,email,callback_ok,callback_nok){	
	tools_db.oneOrNone("UPDATE table_user SET auth_forgetpassword=(floor(random()*999999)) WHERE username=$1 RETURNING auth_forgetpassword,name",email,function(data){
		if(typeof data.auth_forgetpassword!=="undefined"&&data.auth_forgetpassword!==null){
			console.log("SENDING EMAIL to "+email+"; Random: "+data.auth_forgetpassword);

			var protocol = req.protocol;
			var host = req.get('host');
			console.log("Obtain host "+host);
			var missing_path = "";

			if(typeof req.get("missing_path") !=="undefined"){
				missing_path = req.get("missing_path");
				host = req.get("missing_host");
				protocol = req.get("missing_protocol");
			}
			console.log("Ready sending email");
			tools_email.send([email],'Reset Password Aplikasi '+config.app.complete,'template_email_forgetpassword_fromtools',{
				authcode:data.auth_forgetpassword,
				name:data.name,
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
				href: tools_cms.param_jade(req).getFullPath()+"/forgetpassword?email="+email+"&authcode="+data.auth_forgetpassword
			});
			callback_ok(data.auth_forgetpassword);
			// res.mailer.send('template_email_forgetpassword', {
			//     to: email, // REQUIRED. This can be a comma delimited string just like a normal email to field.  
			//     subject: 'Forget Password of '+config.app.complete+' Application',
			//     authcode: data.auth_forgetpassword,
			//     appname: config.app.complete,
			//     href: "http://www.tunjukmaterial.com/resetpasswd.php?email="+email+"&authcode="+data.auth_forgetpassword
		 //  	}, function (err) {
			//     // href: protocol+"://"+host+missing_path+"/forgetpassword?email="+email+"&authcode="+data.auth_forgetpassword
			//     if (err) {
			//       	// handle error 
			//       	console.log("ERROR SENDING MAIL "+JSON.stringify(err));
			//       	callback_nok("Unable to send email");
			//       	return;
			//     }
			//     console.log("EMAIL SENT");
			//     callback_ok(data.auth_forgetpassword);
		 //  	});
		  	console.log("Email tried");
		}else{
			callback_nok("Username not found");
		}
	},function(err){
		console.log("UNABLE GET USERNAME "+JSON.stringify(err));
		callback_nok("Unable to get username");
	});
};

var printError = function(email,authcode,res,errors,req){
	tools_api.redirectTemporary(res,"/forgetpassword?data="+(new Buffer(JSON.stringify({email:email,authcode:authcode,err:errors})).toString('base64')),req);
}

var printOK = function(email,authcode,res,ok,req){
	tools_api.redirectTemporary(res,"/forgetpassword?data="+(new Buffer(JSON.stringify({email:email,authcode:authcode,ok:ok})).toString('base64')),req);
}

router.post('/', function(req, res, next) {
	console.log("FORGET PASSWORD BODY: "+JSON.stringify(req.body));
	var param = req.body;
	if(typeof param.FPemail!=="undefined"){
		var email = param.FPemail;
		//REQUEST EMAIL
		checkEmail(req,res,email,function(){
		  	res.render('cms_forgetpassword', {param_jade:tools_cms.param_jade(req), title: 'Forget Password',email: email, authcode:"" });
		},function(err){
			tools_api.redirectTemporary(res,"/login?data="+(new Buffer(JSON.stringify({err:err})).toString('base64')),req);
		});
	}else{
		//VERIFIKASI KODE AUTHENTIKASI
		if(typeof param.authcode==="undefined" || typeof param.email==="undefined" || typeof param.password==="undefined" || typeof param.confirmpassword==="undefined" || param.email==="" || param.authcode==="" || param.password==="" || param.confirmpassword===""){
			printError(param.email,param.authcode,res,"Incomplete parameter",req);
			return;
		}
		//PARAMETER ADA SEMUA
		if(param.password!==param.confirmpassword){
			printError(param.email,param.authcode,res,"Password not match",req);
			return;
		}
		//VALIDATION WITH DATABASE
		tools_db.oneOrNone("UPDATE table_user SET password=MD5(${password}) WHERE auth_forgetpassword=${auth_forgetpassword} AND username=${username} RETURNING auth_forgetpassword",{username:param.email,auth_forgetpassword:param.authcode,password:param.password},function(data){
			if(typeof data.auth_forgetpassword!=="undefined"&& data.auth_forgetpassword!==null){
				if((""+data.auth_forgetpassword)===(""+param.authcode)){
					//SAMA
					tools_api.redirectTemporary(res,"/login?data="+(new Buffer(JSON.stringify({ok:"Password successfully reset."})).toString('base64')),req);
				}else{
					printError(param.email,param.authcode,res,"Authentication missmatch",req);
				}
			}else{
				printError(param.email,param.authcode,res,"Authentication code not exist",req);
			}
		},function(err){
			printError(param.email,param.authcode,res,"Unable validate authentication code",req);
		});
	}
});

router.get('/', function(req, res, next) {
	var param = req.query
	console.log("FORGET PASSWORD PARAMS: "+JSON.stringify(param));
	if(typeof param.authcode!=="undefined" && typeof param.email!=="undefined"){
		res.render('cms_forgetpassword', {param_jade:tools_cms.param_jade(req), title: 'Forget Password',email: param.email, authcode:param.authcode });
	}else{
		var data = req.query.data;
		if(typeof data!=="undefined" && data!==""){
			var dataObj = JSON.parse(new Buffer(data, 'base64').toString('ascii'));
			var errors = dataObj.err;
			var ok = dataObj.ok;
			var email = dataObj.email;
			var authcode = dataObj.authcode;
			res.render('cms_forgetpassword', {param_jade:tools_cms.param_jade(req), title: 'Forget Password',email: email, authcode:authcode, errors:errors, ok:ok });
		}else{
			tools_api.redirectTemporary(res,"/login",req);
		}
	}
});

module.exports = router;