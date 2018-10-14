var express = require('express');
var router = express.Router();
var tools_db = require(__dirname+'/../tools/tools_db');
var tools_api = require(__dirname+'/../tools/tools_api');
var tools_cms = require(__dirname+'/../tools/tools_cms');
var tools_all = require(__dirname+'/../tools/tools_all');
var tools_routes = require(__dirname+'/../tools/tools_routes');

var router = tools_routes.init();

/* GET home page. */
router.hook('get','/',['admin'],[],function(req,res,role,next){
	console.log("URL "+req.originalUrl);
	var param = {};
	var iteration = 0;
	var query = 3;
	var pool = function(){
		iteration++;
		if(iteration>=query){
			res.render('cms_appsetting', {param_jade: tools_cms.param_jade(req), title: 'Application Setting', param:param });
		};
	};
	tools_db.one('SELECT * FROM table_string_faq ORDER BY id DESC LIMIT 1 OFFSET 0',undefined,function(faq){
		param.faq = faq.content;
		param.faqBuyer = faq.content_buyer;
		param.faqSeller = faq.content_seller;
		pool();
	},function(err){
		param.faq = "";
		pool();
	});
	tools_db.one('SELECT * FROM table_string_tos ORDER BY id DESC LIMIT 1 OFFSET 0',undefined,function(tos){
		param.tos = tos.content;
		pool();
	},function(err){
		param.tos = "";
		pool();
	});
	tools_db.one('SELECT * FROM table_string_help ORDER BY id DESC LIMIT 1 OFFSET 0',undefined,function(help){
		param.help = help.content;
		param.helpBuyer = help.content_buyer;
		param.helpSeller = help.content_seller;
		pool();
	},function(err){
		param.help = "";
		pool();
	});
});

module.exports = router.router;
