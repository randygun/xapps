$('#listOutstanding').bind('tableloaded', function() {
  // do something after the div content has changed
  hideLoading('tab1');
});

$('#listConfirmation').bind('tableloaded', function() {
  // do something after the div content has changed
  hideLoading('tab2');
});

$('#listDeliveryPending').bind('tableloaded', function() {
  // do something after the div content has changed
  hideLoading('tab3');
});

$('#listComplete').bind('tableloaded', function() {
  // do something after the div content has changed
  hideLoading('tab4');
});

var detailData = function(id){
	goTo('order/report?id='+id);
};

var generateReport = function(){
	showLoading();
	apiPOST('api/cms/order/report/'+fromDate+'/'+toDate,{},function(data){
		hideLoading();
		window.open(data.report, '_blank');
	},function(err){
		showNotification('Unable generate report');
	});
}

var filterDate = function(){
	$("#modalFilter").modal('show');
}

var confirmSaveFilter = function(){
	goTo("order?fromDate="+$("#fromDate").val()+"&toDate="+$("#toDate").val());
};

hookOnReady(function(){
	$("#toDate").val(toDate);
	$("#fromDate").val(fromDate);
	showLoading('tab1');
	showLoading('tab2');
	showLoading('tab3');
	showLoading('tab4');
	loadTable("listOutstanding","api/cms/order/outstanding/"+fromDate+"/"+toDate);
	loadTable("listRejected","api/cms/order/reject/"+fromDate+"/"+toDate);
	loadTable("listConfirmation","api/cms/order/confirmation/"+fromDate+"/"+toDate);
	loadTable("listDeliveryPending","api/cms/order/deliverypending/"+fromDate+"/"+toDate);
	loadTable("listComplete","api/cms/order/complete/"+fromDate+"/"+toDate);
	loadTable("listOpenComplaint","api/cms/order/complaint/open/"+fromDate+"/"+toDate);
	loadTable("listCompleteComplaint","api/cms/order/complaint/complete/"+fromDate+"/"+toDate);
	loadTable("listNonComplaint","api/cms/order/complaint/none/"+fromDate+"/"+toDate);
});