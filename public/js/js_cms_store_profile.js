var id_user = null;

var changePIN = function(id){
	id_user = id;
	$("#modalPIN").modal('show');
};

var enableChangeLocation = function(id){
	apiPATCH('api/cms/store/location/unlock',{id_store:id},function(data){
		showNotification('Store Location Unlocked');
	},function(err){
		showNotification('Unable unlock store location');
	});
};

var disableChangeLocation = function(id){
	apiPATCH('api/cms/store/location/lock',{id_store:id},function(data){
		showNotification('Store Location Locked');
	},function(err){
		showNotification('Unable lock store location');
	});
};

var confirmChangePIN = function(){
	apiPATCH('api/cms/user/pin',{id_user:id_user,pin:$("#pin").val()},function(data){
		showNotification('PIN changed');
	},function(err){
		showNotification('Fail to change PIN');
	});
};

$('#tableOutstanding').bind('tableloaded', function() {
  // do something after the div content has changed
  hideLoading('tab1');
});

$('#tableOrder').bind('tableloaded', function() {
  // do something after the div content has changed
  hideLoading('tab2');
});

var detailData = function(id){
	goTo('customer/profile?mode=clear&id='+id);
};

var filterDate = function(){
	$("#modalFilter").modal('show');
}

var confirmSaveFilter = function(){
	goTo("store/profile?id="+store_id+"&fromDate="+$("#fromDate").val()+"&toDate="+$("#toDate").val());
}

hookOnReady(function(){
	$("#toDate").val(toDate);
	$("#fromDate").val(fromDate);
	// drawLineChart('loginChart',['17/1','18/1','19/1','20/1','21/1'],[{label:'',data:[2,3,1,10,6]},{label:'',data:[7,4,8,1,14]}]);
	drawLineChart('loginChart',store_label,[store_data]);
	showLoading('tab1');
	showLoading('tab2');
	loadTable("tableOutstanding","api/cms/store/order/outstanding/"+store_id+"/"+fromDate+"/"+toDate);
	loadTable("tableOrder","api/cms/store/order/all/"+store_id+"/"+fromDate+"/"+toDate);
	loadTable('tableEmployee','api/cms/store/employee/'+store_id);
	loadTable('tableProduct','api/cms/store/'+store_id+"/product");
	loadTable('listComplaints','api/cms/store/complaint/'+store_id);
});

var enableStore = function(id_store){
	apiDELETE('api/cms/store/blocked',{id_store:id_store},function(data){
		showNotification('Store enabled');
	},function(err){
		showNotification('Fail to enable store');
	});
};

var suspendStore = function(id_store){
	apiDELETE('api/cms/store',{id_store:id_store},function(data){
		showNotification('Store suspended');
	},function(err){
		showNotification('Fail to suspend store');
	});
};


var switchEmployee = function(id_user){
	apiPATCH("api/cms/user/switch/"+id_user,{},function(data){
		showNotification("Switch user status success");
	},function(err){
		showNotification("Switch user status fail");
	});
};

var id_delete = null;

var deleteEmployee = function(id_user){
	id_delete = id_user;
	$("#modalDelete").modal('show');
};

var confirmDeleteData = function(){
	apiDELETE("api/cms/user/permanent",{id_user:id_delete},function(data){
		showNotification("Delete user success");
	},function(err){
		showNotification("Dedelete user fail");
	});
};

listenNotification(function(){
	location.reload();
});

$('#modalMap').on('shown.bs.modal', function () {
    google.maps.event.trigger(map, "resize");
});

var showMap = function(id){
	apiGET('api/cms/store/'+id+'/location',{},function(data){
		addMarker(data.location);
		$("#modalMap").modal('show');
	},function(err){
		showNotification('Unable query store location');
	});
}