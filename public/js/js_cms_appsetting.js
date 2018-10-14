$('#listCategory').bind('tableloaded', function() {
  // do something after the div content has changed
  hideLoading('loadingCategory');
});

$('#listSetting').bind('tableloaded', function() {
  // do something after the div content has changed
  hideLoading('loadingSetting');
});

var id_category_delete;
var id_category_edit;
var id_setting_edit;

var removeCategory = function(id){
	id_category_delete = id;
	$("#modalDelete").modal('show');
}

var confirmEditSetting = function(){
	is_close = false;
	var value = $("#valueSettingEdit").val();
	apiPUT('api/cms/setting/application',{id_setting:id_setting_edit,value:value},function(data){
		is_close = true;
		showNotification('Setting updated');
	},function(err){
		is_close = false;
		showNotification('Unable edit setting');
	});
}

var editCategory = function(id){
	apiGET('api/cms/category',{id_category:id},function(data){
		id_category_edit = id;
		$("#nameCategoryEdit").val(data.category.name);
		$("#descriptionCategoryEdit").val(data.category.description);
		$("#modalEditCategory").modal('show');		
	},function(err){
		showNotification('Unable get category');
	});
};

var editSetting = function(id){
	apiGET('api/cms/setting/application/'+id,{},function(data){
		id_setting_edit = id;
		$("#valueSettingEdit").val(data.setting.value);
		$("#modalEditSetting").modal('show');		
	},function(err){
		showNotification('Unable get setting');
	});
};

var is_close = false;

listenNotification(function(){
	if(is_close)location.reload();
});

var confirmEditCategory = function(){
	var name = $("#nameCategoryEdit").val();
	var description = $("#descriptionCategoryEdit").val();
	is_close = false;
	apiPATCH('api/cms/category',{id_category:id_category_edit,name:name,description:description},function(data){
		is_close = true;
		showNotification('Category updated');
	},function(err){
		showNotification('Unable update category');
	});
};

var confirmAddCategory = function(){
	var name = $("#nameCategoryAdd").val();
	var description = $("#descriptionCategoryAdd").val();
	is_close = false;
	apiPUT('api/cms/category',{name:name,description:description},function(data){
		is_close = true;
		showNotification('Category added');
	},function(err){
		showNotification('Unable add category');
	});
};

var confirmDeleteCategory = function(){
	is_close = false;
	apiDELETE('api/cms/category',{id_category:id_category_delete},function(data){
		is_close = true;
		showNotification('Category deleted');
	},function(err){
		showNotification('Unable delete category');
		is_close = false;
	});
}

var is_close = false;

listenNotification(function(){
	if(is_close) location.reload;
});

var updateTOS = function(){
	is_close = false;
	var value = $("#tos").val();
	apiPOST('api/string/tos',{value:value},function(data){
		is_close = true;
		showNotification('Data updated');
	},function(err){
		is_close = false;
		showNotification('Unable update data');
	});
};

var updateHELP = function(){
	is_close = false;
	var value = $("#help").val();
	apiPOST('api/string/help',{value:value},function(data){
		is_close = true;
		showNotification('Data updated');
	},function(err){
		is_close = false;
		showNotification('Unable update data');
	});
};

var updateHELP2 = function(){
	var formData = new FormData();
	var fileHelp = $("#fileHelp").get(0).files;
	if(typeof fileHelp!=="undefined"){
		// alert("NOT UNDEFINED");
		for (var i = 0; i < fileHelp.length; i++) {
	      	var file = fileHelp[i];
	      	// add the files to formData object for the data payload
	      	formData.append('help', file, file.name);
	      	// alert("APPEND "+file.name);
	    }
	}
	apiFILE("api/string/help",formData,function(data){
    	is_close = true;
		showNotification('Data updated');
    },function(err){
    	is_close = false;
		showNotification('Unable update data');
    });
};
var updateHELP2Buyer = function(){
	var formData = new FormData();
	var fileHelp = $("#fileHelpBuyer").get(0).files;
	if(typeof fileHelp!=="undefined"){
		// alert("NOT UNDEFINED");
		for (var i = 0; i < fileHelp.length; i++) {
	      	var file = fileHelp[i];
	      	// add the files to formData object for the data payload
	      	formData.append('help', file, file.name);
	      	// alert("APPEND "+file.name);
	    }
	}
	apiFILE("api/string/help/buyer",formData,function(data){
    	is_close = true;
		showNotification('Data updated');
    },function(err){
    	is_close = false;
		showNotification('Unable update data');
    });
};
var updateHELP2Seller = function(){
	var formData = new FormData();
	var fileHelp = $("#fileHelpSeller").get(0).files;
	if(typeof fileHelp!=="undefined"){
		// alert("NOT UNDEFINED");
		for (var i = 0; i < fileHelp.length; i++) {
	      	var file = fileHelp[i];
	      	// add the files to formData object for the data payload
	      	formData.append('help', file, file.name);
	      	// alert("APPEND "+file.name);
	    }
	}
	apiFILE("api/string/help/seller",formData,function(data){
    	is_close = true;
		showNotification('Data updated');
    },function(err){
    	is_close = false;
		showNotification('Unable update data');
    });
};

var updateFAQ = function(){
	is_close = false;
	var value = $("#faq").val();
	apiPOST('api/string/faq',{value:value},function(data){
		is_close = true;
		showNotification('Data updated');
	},function(err){
		is_close = false;
		showNotification('Unable update data');
	});
};

var updateFAQ2 = function(){
	var formData = new FormData();
	var fileFAQ = $("#fileFAQ").get(0).files;
	if(typeof fileFAQ!=="undefined"){
		// alert("NOT UNDEFINED");
		for (var i = 0; i < fileFAQ.length; i++) {
	      	var file = fileFAQ[i];
	      	// add the files to formData object for the data payload
	      	formData.append('faq', file, file.name);
	      	// alert("APPEND "+file.name);
	    }
	}
	apiFILE("api/string/faq",formData,function(data){
    	is_close = true;
		showNotification('Data updated');
    },function(err){
    	is_close = false;
		showNotification('Unable update data');
    });
};

var updateFAQ2Seller = function(){
	var formData = new FormData();
	var fileFAQ = $("#fileFAQSeller").get(0).files;
	if(typeof fileFAQ!=="undefined"){
		// alert("NOT UNDEFINED");
		for (var i = 0; i < fileFAQ.length; i++) {
	      	var file = fileFAQ[i];
	      	// add the files to formData object for the data payload
	      	formData.append('faq', file, file.name);
	      	// alert("APPEND "+file.name);
	    }
	}
	apiFILE("api/string/faq/seller",formData,function(data){
    	is_close = true;
		showNotification('Data updated');
    },function(err){
    	is_close = false;
		showNotification('Unable update data');
    });
};

var updateFAQ2Buyer = function(){
	var formData = new FormData();
	var fileFAQ = $("#fileFAQBuyer").get(0).files;
	if(typeof fileFAQ!=="undefined"){
		// alert("NOT UNDEFINED");
		for (var i = 0; i < fileFAQ.length; i++) {
	      	var file = fileFAQ[i];
	      	// add the files to formData object for the data payload
	      	formData.append('faq', file, file.name);
	      	// alert("APPEND "+file.name);
	    }
	}
	apiFILE("api/string/faq/buyer",formData,function(data){
    	is_close = true;
		showNotification('Data updated');
    },function(err){
    	is_close = false;
		showNotification('Unable update data');
    });
};

hookOnReady(function(){
	showLoading('loadingCategory');
	showLoading('loadingSetting');
	loadTable("listCategory","api/cms/setting/category");
	loadTable("listSetting","api/cms/setting/application");
});