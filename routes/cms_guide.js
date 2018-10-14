// res.sendFile('index.html');

var express = require('express');
var router = express.Router();
var tools_api = require(__dirname+'/../tools/tools_api');
var tools_cms = require(__dirname+'/../tools/tools_cms');
var tools_db = require(__dirname+'/../tools/tools_db');
var tools_all = require(__dirname+'/../tools/tools_all');
var login = require(__dirname+"/../proc/proc_login");
var config = require(__dirname+"/../config");
var path = require('path');

/* GET guide page. */
router.get('/', function(req, res, next) {
	console.log('GUIDE');
	// var param_jade = tools_cms.param_jade(req);
	// console.log(JSON.stringify(param_jade));
	res.sendfile(path.resolve('public/guide.html'));
	// res.render('cms_login', { param_jade: param_jade, title: 'Login',errors:errors,ok:ok});
	// res.sendFile(__dirname+'/../public/guide.html');
});

module.exports = router;
