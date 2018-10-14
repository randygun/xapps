var express = require('express');
var router = express.Router();
var tools_api = require(__dirname+'/../tools/tools_api');
var tools_cms = require(__dirname+'/../tools/tools_cms');
var tools_all = require(__dirname+'/../tools/tools_all');

var berhasil = "-";

/* GET home page. */
router.get('/', function(req, res, next) {
	console.log("URL "+req.originalUrl);
	var param = {};
	if(typeof req.query.fromDate === 'undefined') param.fromDate = '2017-01-01';
	else param.fromDate = req.query.fromDate;
	if(typeof req.query.toDate === 'undefined') param.toDate = (new Date()).yyyymmdd();
	else param.toDate = req.query.toDate;
	res.render('cms_reports', {param_jade: tools_cms.param_jade(req), title: 'Report', param:param });
});

router.get('/category', function(req, res, next) {
	console.log("URL "+req.originalUrl);
	var param = {};
	if(typeof req.query.fromDate === 'undefined') param.fromDate = '2017-01-01';
	else param.fromDate = req.query.fromDate;
	if(typeof req.query.toDate === 'undefined') param.toDate = (new Date()).yyyymmdd();
	else param.toDate = req.query.toDate;
	res.render('cms_reports_category', {param_jade: tools_cms.param_jade(req), title: 'Report', param:param });
});

module.exports = router;
