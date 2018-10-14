var tools_routes = require(__dirname+"/../tools/tools_routes");
var tools_api = require(__dirname+"/../tools/tools_api");
var tools_db = require(__dirname+"/../tools/tools_db");
var tools_all = require(__dirname+"/../tools/tools_all");
var config = require(__dirname+"/../config");
var lang = require(__dirname+"/../language");
var router = tools_routes.init();
var Entities = require('html-entities').AllHtmlEntities;

var fs = require('fs');

router.hook('post','/',['admin'],['file','content'],function(req,res,role,next){
	var param = req.body;
	var entities = new Entities();
	param.content = entities.decode(param.content);
	if(
		param.file==='template_email_order_new_seller' || 
		param.file==='template_email_order_new_buyer' ||
		param.file==='template_email_forgetpassword_fromtools' ||
		param.file==='template_email_order_complete_buyer' ||
		param.file==='template_email_order_complete_seller' ||
		param.file==='template_email_order_reject' ||
		param.file==='template_email_password_change' ||
		param.file==='template_email_pin_change'||
		param.file==='template_email_register_buyer'||
		param.file==='template_email_register_seller'||
		param.file==='template_email_seller_paid' ||
		param.file==='template_email_username_change'||
		param.file==='template_email_order_agree_buyer'||
		param.file==='template_email_order_agree_seller'||
		param.file==='template_email_order_deliver_buyer'||
		param.file==='template_email_order_deliver_seller'||
		param.file==='template_email_order_paid_buyer'||
		param.file==='template_email_order_paid_seller'
		){
		fs.writeFile(__dirname+'/../views/'+param.file+".jade", param.content, function(err) {
		    if(err) {
		    	tools_api.error422(req,res,lang.generic.b);
		        return;
		    }
		    tools_api.success200(res);
		});
	}else{
		tools_api.error422(req,res,lang.generic.b);
	}
});

module.exports = router.router;
