var express = require('express');
var router = express.Router();
var tools_db = require(__dirname+'/../tools/tools_db');
var tools_api = require(__dirname+'/../tools/tools_api');
var tools_cms = require(__dirname+'/../tools/tools_cms');
var tools_all = require(__dirname+'/../tools/tools_all');
var tools_routes = require(__dirname+'/../tools/tools_routes');
var config = require(__dirname+"/../config");
var fs = require('fs');

var router = tools_routes.init();

/* GET home page. */
router.hook('get','/',['admin'],[],function(req,res,role,next){
	console.log("URL ");
	var param = {};
	param.support = {
		phone: config.setting.support_phone,
		email: config.setting.support_email,
		operationaltime: config.setting.support_operationaltime
	};
	param.attachments = [
		{
			fileName:'tunjukmaterial.png',
			filePath: __dirname+"/../public/images/tm_red.png",
			cid: 'tmpicture'
		}
	];
	fs.readFile(__dirname+'/../views/template_email_pin_change.jade', 'utf8', function (err,data) {
		if (err) {
			return console.log(err);
		}
		param.saved = data;
		res.render('cms_email_pinchange', {param_jade: tools_cms.param_jade(req), title: 'Template Email Change PIN', param:param });
		console.log(data);
	});
});

module.exports = router.router;
