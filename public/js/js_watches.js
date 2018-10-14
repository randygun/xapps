hookOnReady(function(){
	loadTable("watches","api/watch");
});

var is_close = false;
var id_delete = 0;
var id_activate = 0;
var id_edit = 0;
var is_create = false;

var addNewWatch = function(){
	is_create = true;
	$("#id_gps").val("");
	$("#id_manufacturer").val("3G");
	$("#phone").val("");
	$("#is_active").val("");
	$("#modalWatchTitle").html("Add New Watch");
	$("#modalWatch").modal("show");
};

var editData = function(id,id_gps){
	showLoading();
	id_edit = id;
	apiGET("api/watch/"+id_gps,{},function(data){
		is_create = false;
		$("#id_gps").val(data.watch.id_gps);
		$("#id_manufacturer").val(data.watch.id_manufacturer);
		$("#phone").val(data.watch.phone_subscribe);
		$("#is_active").val(data.watch.is_active.toString());
		$("#modalWatchTitle").html("Update Watch");
		$("#modalWatch").modal("show");
	},function(err){
		hideLoading();
	});
};

var confirmSaveData = function(){
	is_close = false;
	if($("#id_gps").val().length!==10){
		showNotification("ID GPS should be 10 characters");
		return;
	}
    var param = {
    	id_gps:$("#id_gps").val(),
    	id_manufacturer:$("#id_manufacturer").val(),
    	is_active:$("#is_active").val(),
    	phone:$("#phone").val(),
    	is_create:is_create,
    	id_watch:id_edit
    };
	showLoading('modalSave');
    apiPOST("api/watch",param,function(data){
    	is_close = true;
		if(!is_create) showNotification("Update watch success");
		else showNotification("Create watch success");
    },function(err){
    	hideLoading('modalSave');
    	showNotification("Update watch fail");
    });
};

var activateData = function(id){
	showLoading();
	id_activate = id;
	$("#modalActivate").modal("show");
};

var confirmActivateData = function(){
	is_close = false;
	apiPOST("api/watch/"+id_activate,{},function(data){
		is_close = true;
		showNotification("Activate watch success");
	},function(err){
		is_close = false;
	});
};

var deleteData = function(id){
	showLoading();
	id_delete = id;
	$("#modalDelete").modal("show");
};

var confirmDeleteData = function(){
	is_close = false;
	apiDELETE("api/watch/"+id_delete,{},function(data){
		is_close = true;
		showNotification("De-Activate watch success");
	},function(err){
		is_close = false;
	});
};

listenModal("modalWatch",function(){
	hideLoading();
});
listenModal("modalDelete",function(){
	hideLoading();
});
listenModal("modalActivate",function(){
	hideLoading();
});

listenNotification(function(){
	hideLoading('modalSave');
	if(is_close) location.reload();
});