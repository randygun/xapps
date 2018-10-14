$('#listStore').bind('tableloaded', function() {
  // do something after the div content has changed
  hideLoading('tab1');
});

$('#listStoreBlocked').bind('tableloaded', function() {
  // do something after the div content has changed
  hideLoading('tab2');
});

hookOnReady(function(){
	$("#toDate").val(toDate);
	$("#fromDate").val(fromDate);
	showLoading('tab1');
	showLoading('tab2');
	loadTable("listStore","api/cms/store/"+fromDate+"/"+toDate);
	loadTable("listStoreBlocked","api/cms/store/blocked/"+fromDate+"/"+toDate);
});

var detailDataBlocked = function(id){
	goTo('store/profile?mode=blocked&id='+id+"&fromDate="+fromDate+"&toDate="+toDate);
};

var detailData = function(id){
	goTo('store/profile?mode=clear&id='+id+"&fromDate="+fromDate+"&toDate="+toDate);
};

var filterDate = function(){
	$("#modalFilter").modal('show');
}

var confirmSaveFilter = function(){
	goTo("store?fromDate="+$("#fromDate").val()+"&toDate="+$("#toDate").val());
}

var generateReport = function(){
	showLoading();
	apiPOST("api/cms/store/report/"+fromDate+"/"+toDate,{},function(data){
		hideLoading();
		window.open(data.report, '_blank');
	},function(err){
		showNotification('Unable generate report');
	});
}

