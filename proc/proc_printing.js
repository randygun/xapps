var phantom = require('phantom');

module.exports = this;

this.pdfSO = function(id_order,watermark,callback){
	var paramwatermark = "";
	if(typeof watermark!=='undefined') paramwatermark = "&watermark="+watermark;
	phantom.create().then(function(ph) {
		ph.createPage().then(function(page) {
			page.property('viewportSize', {width: 800, height: 10}).then(function() {
				page.open("http://127.0.0.1:3009/salesorder?id="+id_order+paramwatermark).then(function(status) {
					page.render(__dirname+'/../public/salesorder/SalesOrder'+id_order+'.pdf').then(function() {
						ph.exit();
						console.log("PHANTOM RENDER COMPLETE");
						if(typeof callback!=='undefined') callback();
					});
				});
			});
		});
	});
};

this.pdfMutasi = function(id_mutasi,id_user,date_start,date_end,callback){
	phantom.create().then(function(ph) {
	    ph.createPage().then(function(page) {
	    	page.property('viewportSize', {width: 800, height: 10}).then(function() {
		        page.open("http://127.0.0.1:3009/mutasi?id_user="+id_user+"&date_start="+date_start+"&date_end="+date_end).then(function(status) {
		        	var file = 'Mutasi'+id_mutasi+'.pdf';
		            page.render(__dirname+'/../public/mutasi/'+file).then(function() {
						ph.exit();
		            	if(typeof callback!=='undefined') callback(file);
		            });
		        });
	    	});
	    });
	});
};