var express = require('express');
var router = express.Router();
var tools_api = require(__dirname+'/../tools/tools_api');
var tools_cms = require(__dirname+'/../tools/tools_cms');
var tools_all = require(__dirname+'/../tools/tools_all');

var berhasil = "-";

/* GET home page. */
router.get('/', function(req, res, next) {
	console.log("URL "+req.originalUrl);
	var cookies = tools_all.getCookies(req);
	var token = tools_api.RSA.decrypt(cookies.token_access);
	var param = {};
	res.render('cms_notification', {param_jade: tools_cms.param_jade(req), title: 'Notification', cookies: cookies, token: token, param:param });
});

module.exports = router;
