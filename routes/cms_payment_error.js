var express = require('express');
var router = express.Router();
var tools_cms = require(__dirname+'/../tools/tools_cms');
var tools_db = require(__dirname+'/../tools/tools_db');

/* GET home page. */
router.get('/', function(req, res, next) {
	var param_jade = tools_cms.param_jade(req);
	var IPADDR = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
	console.log('VERITRANS req.ip: '+req.ip+";"+IPADDR+";"+JSON.stringify(req.body)+";"+JSON.stringify(req.headers));
	res.render('cms_payment_error', { param_jade: param_jade});
});

module.exports = router;
