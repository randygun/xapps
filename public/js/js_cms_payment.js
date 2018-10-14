$('#listSellerUnpaid').bind('tableloaded', function() {
  // do something after the div content has changed
  hideLoading('tab1');
});

$('#listBuyerUnpaid').bind('tableloaded', function() {
  // do something after the div content has changed
  hideLoading('tab2');
});

$('#listSellerPaid').bind('tableloaded', function() {
  // do something after the div content has changed
  hideLoading('tab3');
});

$('#listBuyerPaid').bind('tableloaded', function() {
  // do something after the div content has changed
  hideLoading('tab4');
});

var id_buyer = 0;
var id_seller = 0;

var showReport = function(id){
	goTo('order/report?id='+id);
};

var payBuyer = function(id){
	id_buyer = id;
	$("#modalNextBuyer").modal('show');
}

var is_close= false;

listenNotification(function(){
	if(is_close) location.reload();
})

var confirmPaySeller = function(){
	is_close= false;
	apiPATCH('api/cms/payment/seller',{id:id_seller},function(data){
		is_close= true;
		showNotification('Payment success');
	},function(err){
		is_close= false;
		showNotification('Unable to process');
	});
};

var confirmPayBuyer = function(){
	is_close= false;
	apiPATCH('api/cms/payment/buyer',{id:id_buyer},function(data){
		is_close= true;
		showNotification('Payment success');
	},function(err){
		is_close= false;
		showNotification('Unable to process');
	});
};

var confirmNoPaySeller = function(){
	is_close= false;
	apiDELETE('api/cms/payment/seller',{id:id_seller},function(data){
		is_close= true;
		showNotification('Payment success');
	},function(err){
		is_close= false;
		showNotification('Unable to process');
	});
};

var confirmNoPayBuyer = function(){
	is_close= false;
	apiDELETE('api/cms/payment/buyer',{id:id_buyer},function(data){
		is_close= true;
		showNotification('Payment success');
	},function(err){
		is_close= false;
		showNotification('Unable to process');
	});
};

var paySeller = function(id){
	id_seller = id;
	$("#modalNextSeller").modal('show');
}

// Date.prototype.yyyymmdd = function() {
//   var mm = this.getMonth() + 1; // getMonth() is zero-based
//   var dd = this.getDate();

//   return [this.getFullYear(),
//           (mm>9 ? '' : '0') + mm,
//           (dd>9 ? '' : '0') + dd
//          ].join('-');
// };

var filterDate = function(){
	$("#modalFilter").modal('show');
}

var confirmSaveFilter = function(){
	goTo("payment?fromDate="+$("#fromDate").val()+"&toDate="+$("#toDate").val());
}

var generateReportPaymentSeller = function(){
	// showLoading();
	apiGET("api/cms/payment/seller/"+fromDate+"/"+toDate+"/export",{},function(data){
		// hideLoading();
		window.open(data.report, '_blank');
	},function(err){
		showNotification('Unable generate report');
	});
};

var generateReportPaymentBuyer = function(){
	// showLoading();
	apiGET("api/cms/payment/buyer/"+fromDate+"/"+toDate+"/export",{},function(data){
		// hideLoading();
		window.open(data.report, '_blank');
	},function(err){
		showNotification('Unable generate report');
	});
};

hookOnReady(function(){
	$("#toDate").val(toDate);
	$("#fromDate").val(fromDate);
	showLoading('tab1');
	showLoading('tab2');
	showLoading('tab3');
	showLoading('tab4');
	loadTable("listSellerUnpaid","api/cms/payment/seller/unpaid/"+fromDate+"/"+toDate);
	loadTable("listBuyerUnpaid","api/cms/payment/buyer/unpaid/"+fromDate+"/"+toDate);
	loadTable("listSellerPaid","api/cms/payment/seller/paid/"+fromDate+"/"+toDate);
	loadTable("listBuyerPaid","api/cms/payment/buyer/paid/"+fromDate+"/"+toDate);
});