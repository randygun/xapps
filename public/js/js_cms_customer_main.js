$('#listCustomer').bind('tableloaded', function() {
  // do something after the div content has changed
  hideLoading('tab1');
});

$('#listCustomerBlocked').bind('tableloaded', function() {
  // do something after the div content has changed
  hideLoading('tab2');
});

hookOnReady(function(){
	showLoading('tab1');
	showLoading('tab2');
	loadTable("listCustomer","api/cms/customer");
	loadTable("listCustomerBlocked","api/cms/customer/blocked");
});

var detailDataBlocked = function(id){
	goTo('customer/profile?mode=blocked&id='+id);
};

var detailData = function(id){
	goTo('customer/profile?mode=clear&id='+id);
};

