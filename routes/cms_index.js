var express = require('express');
var router = express.Router();
var tools_api = require(__dirname+'/../tools/tools_api');
var tools_cms = require(__dirname+'/../tools/tools_cms');
var tools_all = require(__dirname+'/../tools/tools_all');
var config = require(__dirname+'/../config');

/* GET home page. */
router.get('/', function(req, res, next) {
	res.writeHead(302,{'Location':tools_cms.param_jade(req).getFullPath()+'/home'});
	res.end();	
});

module.exports = router;
