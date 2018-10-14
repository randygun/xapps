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
	if(typeof req.query.fromDate === 'undefined') param.fromDate = '2017-01-01';
	else param.fromDate = req.query.fromDate;
	if(typeof req.query.toDate === 'undefined') param.toDate = (new Date()).yyyymmdd();
	else param.toDate = req.query.toDate;
	res.render('cms_order', {param_jade: tools_cms.param_jade(req), title: 'Order', param:param });
});

module.exports = router.router;
