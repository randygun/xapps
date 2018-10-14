var express = require('express');
var router = express.Router();
var tools_api = require(__dirname+'/../tools/tools_api');
var tools_cms = require(__dirname+'/../tools/tools_cms');
var tools_all = require(__dirname+'/../tools/tools_all');
var config = require(__dirname+'/../config');

/* GET home page. */
router.get('/', function(req, res, next) {
	console.log("URL "+req.originalUrl);
	var param = {constant:config.dynamic};
	res.render('cms_management_users', { param_jade:tools_cms.param_jade(req), title: 'User Management', param: param});
});

module.exports = router;
