var id_user = null;

var changePIN = function(id){
	id_user = id;
	$("#modalPIN").modal('show');
};

var confirmChangePIN = function(){
	console.log("confirmChangePIN");
	var pin = $("#pin").val();
	apiPATCH('api/cms/user/pin',{id_user:id_user,pin:pin},function(data){
		showNotification('PIN changed');
	},function(err){
		showNotification('Fail to change PIN');
	});
};

$('#tableHistory').bind('tableloaded', function(event,data) {
  // do something after the div content has changed
  // alert("DATABANG "+JSON.stringify(data));
  $('#historysaldoawal').html(': Rp. '+parseInt(data.other.first_balance).formatMoney(0));
  $('#historysaldoakhir').html(': Rp. '+parseInt(data.other.last_balance).formatMoney(0));
  $('#historycr').html(': Rp. '+parseInt(data.other.cr).formatMoney(0));
  $('#historydb').html(': Rp. '+parseInt(data.other.db).formatMoney(0));
  hideLoading('tab1');
});

$('#tableOutstanding').bind('tableloaded', function() {
  // do something after the div content has changed
  hideLoading('tab2');
});

$('#tableOrder').bind('tableloaded', function() {
  // do something after the div content has changed
  hideLoading('tab3');
});

var detailData = function(id){
	goTo('order/report?id='+id);
};

hookOnReady(function(){
	// drawLineChart('loginChart',['17/1','18/1','19/1','20/1','21/1'],[{label:'',data:[2,3,1,10,6]},{label:'',data:[7,4,8,1,14]}]);
	drawLineChart('loginChart',user_label,[user_data]);
	showLoading('tab1');
	showLoading('tab2');
	showLoading('tab3');
	loadTable("tableHistory","api/cms/customer/history/"+user_id);
	loadTable("tableOutstanding","api/cms/customer/order/outstanding/"+user_id);
	loadTable("tableOrder","api/cms/customer/order/all/"+user_id);
	loadTable('listComplaints','api/cms/customer/complaint/'+user_id);
});

var enableCustomer = function(id_customer){
	apiDELETE('api/cms/customer/blocked',{id_customer:id_customer},function(data){
		showNotification('Customer enabled');
	},function(err){
		showNotification('Fail to enable customer');
	});
};

var suspendCustomer = function(id_customer){
	apiDELETE('api/cms/customer',{id_customer:id_customer},function(data){
		showNotification('Customer suspended');
	},function(err){
		showNotification('Fail to suspend customer');
	});
};

listenNotification(function(){
	location.reload();
});