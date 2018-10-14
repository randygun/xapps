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
	res.render('cms_ads', {param_jade: tools_cms.param_jade(req), title: 'Ads', param:param });
});

module.exports = router;
