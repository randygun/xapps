hookOnReady(function(){
	loadTable("installments","api/cms/installment");
});

var is_close = false;
var id_delete = 0;
var id_activate = 0;
var id_edit = 0;
var is_create = false;

var addNewBank = function(){
	is_create = true;
	$("#name").val("");
	$("#code").val("");
	$("#terms").val("");
	$("#is_active").val("");
	$("#modalInstallmentTitle").html("Add New Bank");
	$("#modalInstallment").modal("show");
};

var editData = function(id){
	showLoading();
	id_edit = id;
	apiGET("api/cms/installment/"+id,{},function(data){
		is_create = false;
		$("#name").val(data.installment.name);
		$("#code").val(data.installment.code);
		$("#terms").val(JSON.stringify(data.installment.terms).replace(/\[/g,'').replace(/\]/g,''));
		$("#is_active").val(data.installment.is_active.toString());
		$("#modalInstallmentTitle").html("Update Bank");
		$("#modalInstallment").modal("show");
	},function(err){
		hideLoading();
	});
};

var confirmSaveData = function(){
	is_close = false;	
	showLoading('modalSave');
	var param = {
    	name: $("#name").val(),
    	code: $("#code").val(),
    	terms: $("#terms").val(),
    	is_active: $("#is_active").val(),
    	id_edit: id_edit
    };
    // alert(JSON.stringify(param));
    apiPOST("api/cms/installment",param,function(data){
		is_close = true;
		if(!is_create) showNotification("Update Bank success");
		else showNotification("Create Bank success");
    },function(err){
    	hideLoading('modalSave');
    	showNotification("Update Bank fail");
    });
};

var activateData = function(id){
	showLoading();
	id_activate = id;
	$("#modalActivate").modal("show");
};

var confirmActivateData = function(){
	is_close = false;
	apiPATCH("api/cms/user",{id_user:id_activate},function(data){
		is_close = true;
		showNotification("Activate user success");
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
	apiDELETE("api/cms/installment/"+id_delete,{},function(data){
		is_close = true;
		showNotification("Delete data success");
	},function(err){
		is_close = false;
	});
};

listenModal("modalUser",function(){
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