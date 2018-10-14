var mailer = require('express-mailer');
var config = require(__dirname+"/../config");
var tools_db = require(__dirname+"/tools_db");
var thisapp = null;

var instance = this;

var param = {
		from: config.email.from,
		host: config.email.host, // hostname 
		// secureConnection: true, // use SSL 
		secureConnection: false, // use SSL 
		// port: 465, // port for secure SMTP 
		port: 25, // port for secure SMTP 
		transportMethod: 'SMTP', // default is SMTP. Accepts anything that nodemailer accepts 
		auth: {
			user: config.email.username,
			pass: config.email.password
		}
	};

this.init = function(app){
	thisapp = app;
	mailer.extend(app, param);
};

this.update = function(host,username,password){
	param.from = username;
	param.host = host;
	param.auth.user = username;
	param.auth.pass = password;
	thisapp.mailer.update(param,function(){});
};

this.send = function(array_to,subject,template_jade,param){
	process.send({module:'email',object:{to:array_to,subject:subject,template:template_jade,param:param}});
};

this.logSend = function(app,array_to,subject,jadefile,event,param,callback_ok,callback_nok){
	var ppp = {
		title: subject,
		body: null,
		from: config.email.from,
		event: event,
		result: null,
		template: jadefile,
		param:JSON.stringify(param),
		to: JSON.stringify(array_to),
		err:null
	};
	var variable = {};
	variable.param = param;
	variable.subject = subject;
	variable.to = array_to.join(',');
	app.render(jadefile, variable, function(err, html) {
		if(err){
			ppp.err = JSON.stringify(err);
		}
		ppp.body = html;
		tools_db.one('INSERT INTO table_email ("title","body","from","event","result","template","param","to","err") VALUES (${title},${body},${from},${event},${result},${template},${param},${to},${err}) RETURNING *',ppp,function(data){
			if(typeof callback_ok !== 'undefined') callback_ok();
		},function(err){
			if(typeof callback_nok !== 'undefined') callback_nok();
		});
	});
};

this.workersend = function(array_to,subject,template_jade,param,callback){
	var attachments = [];
	if(typeof param.attachments !== 'undefined') attachments = param.attachments;
	console.log('Trying to send email, subject: '+subject+":attachments: "+JSON.stringify(attachments));
	thisapp.mailer.send(template_jade, {
	    to: array_to.join(', '), // REQUIRED. This can be a comma delimited string just like a normal email to field.  
	    subject: subject,
	    param: param,
	    attachments: attachments
  	}, function (err) {
	    if (err) {
	    	console.log("Email ERROR: "+JSON.stringify(err));
	    	if(typeof callback!=='undefined') callback(err);
	      	return;
	    }
	    if(typeof callback!=='undefined') callback();
	    console.log("Email SUCCESS");
  	});
};

this.validate = function(email){
	var re = /^(([^<>()\[\]\.,;:\s@\"]+(\.[^<>()\[\]\.,;:\s@\"]+)*)|(\".+\"))@(([^<>()[\]\.,;:\s@\"]+\.)+[^<>()[\]\.,;:\s@\"]{2,})$/i;
	return re.test(email);
}

module.exports = this;
