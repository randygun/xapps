var express = require('express');
var router = express.Router();
var tools_api = require(__dirname+'/../tools/tools_api');
var tools_cms = require(__dirname+'/../tools/tools_cms');
var tools_all = require(__dirname+'/../tools/tools_all');
var tools_routes = require(__dirname+'/../tools/tools_routes');

var berhasil = "-";

var router = tools_routes.init();

router.hook('get','/',['admin'],[],function(req,res,role,next){
	console.log("URL "+req.originalUrl);
	var param = {};
	res.render('cms_home', {param_jade: tools_cms.param_jade(req), title: 'Home / Dashboard', param:param });
});

module.exports = router.router;