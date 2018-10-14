var express = require('express');
var router = express.Router();
var phantom = require('phantom');

/* GET home page. */
router.get('/', function(req, res, next) {
	phantom.create().then(function(ph) {
	    ph.createPage().then(function(page) {
	    	page.property('viewportSize', {width: 800, height: 10}).then(function() {
		        page.open("http://127.0.0.1:3009/salesorder?id=35").then(function(status) {
		            page.render(__dirname+'/../public/salesorder.pdf').then(function() {
		                console.log('Page Rendered');
		                ph.exit();
		            });
		        });
	    	});
	    });
	});
  	res.render('index', { title: 'Express' });
});

module.exports = router;
