var express = require('express');
var router = express.Router();
var tools_api = require(__dirname+'/../tools/tools_api');
var tools_all = require(__dirname+'/../tools/tools_all');

/* GET home page. */
router.get('/', function(req, res, next) {
	tools_all.saveCookies(res,{});
	var protocol = req.protocol;
	var host = req.get('host');
	var missing_path = "";

	if(typeof req.get("missing_path") !=="undefined"){
		missing_path = req.get("missing_path");
		host = req.get("missing_host");
		protocol = req.get("missing_protocol");
	}
	tools_api.redirectTemporary(res,'/login',req);
});


module.exports = router;
