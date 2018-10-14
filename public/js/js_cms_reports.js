hookOnReady(function(){
	$("#toDate").val(toDate);
	$("#fromDate").val(fromDate);
	loadTable('tableReport',"api/cms/report/"+fromDate+"/"+toDate);
});

var filterDate = function(){
	$("#modalFilter").modal('show');
}

var confirmSaveFilter = function(){
	goTo("reports?fromDate="+$("#fromDate").val()+"&toDate="+$("#toDate").val());
}

var generateReport = function(){
	showLoading();
	apiPOST('api/cms/report/'+fromDate+'/'+toDate,{},function(data){
		hideLoading();
		window.open(data.report, '_blank');
	},function(err){
		showNotification('Unable generate report');
	});
}