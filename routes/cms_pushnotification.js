var express = require('express');
var router = express.Router();
var tools_api = require(__dirname+'/../tools/tools_api');
var tools_cms = require(__dirname+'/../tools/tools_cms');

/* GET home page. */
router.get('/', function(req, res, next) {
	var param = {};
	res.render('cms_pushnotification', {param_jade: tools_cms.param_jade(req), title: 'Push Notification', param:param});
});

module.exports = router;
