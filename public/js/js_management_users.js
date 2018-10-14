hookOnReady(function(){
	loadTable("managementUsers","api/cms/admins");
});

var is_close = false;
var id_delete = 0;
var id_activate = 0;
var id_edit = 0;
var is_create = false;

var avatarButton = function(){
	$("#fakeavatar").click();
};

$('#fakeavatar').on('click', function(){
	$(this).get(0).value = null;
});

$('#fakeavatar').on('change', function(){
  	var files = $(this).get(0).files;
  	if (files.length > 0){
  		if (FileReader && files && files.length) {
	        var fr = new FileReader();
	        fr.onload = function () {
	        	$("#avatar").attr("src",fr.result);
	        }
	        fr.readAsDataURL(files[0]);
	    }
	}else{

	}
});

var addNewUser = function(){
	is_create = true;
	$("#avatar").attr("src",js_cms_fullhost+"images/avatar.png");
	$("#username").val("");
	$("#password").val("");
	$("#is_active").val("");
	$("#modalUserTitle").html("Add New User");
	$("#modalUser").modal("show");
};

var editData = function(id){
	showLoading();
	id_edit = id;
	apiGET("api/cms/user/profile",{id_user:id},function(data){
		is_create = false;
		$("#avatar").attr("src",data.user.avatar);
		$("#username").val(data.user.username);
		$("#password").val("#######");
		$("#is_active").val(data.user.is_active.toString());
		$("#modalUserTitle").html("Update User");
		$("#modalUser").modal("show");
	},function(err){
		hideLoading();
	});
};

var confirmSaveData = function(){
	is_close = false;
	if(($("#password").val().length<8 && $("#password").val()!=="#######" && !is_create)||(is_create && $("#password").val().length<8)){
		showNotification("Password should more / equal than 8 characters");
		return;
	}
	var formData = new FormData();
	var filesAvatar = $("#fakeavatar").get(0).files;
	if(typeof filesAvatar!=="undefined"){
		// alert("NOT UNDEFINED");
		for (var i = 0; i < filesAvatar.length; i++) {
	      	var file = filesAvatar[i];
	      	// add the files to formData object for the data payload
	      	$('.progress').attr('style','');
			$('.progress-bar').text('0%');
    		$('.progress-bar').width('0%');
	      	formData.append('avatar', file, file.name);
	      	// alert("APPEND "+file.name);
	    }
	}
    formData.append('id_user',id_edit);
    formData.append('username',$("#username").val());
    formData.append('password',$("#password").val());
    formData.append('is_active',$("#is_active").val());
    formData.append('is_create',is_create);
	showLoading('modalSave');
    apiFILE("api/cms/user",formData,function(data){
    	if(!is_create && data.user.is_self){
    		//Data sendiri, update cookies
    		var cookieValue = JSON.parse(Cookies.get("gpstracking"));
			cookieValue.avatar = data.user.avatar;
			cookieValue.username = data.user.username;
			cookieValue.description_role = data.user.description_role;
			Cookies.set("gpstracking",JSON.stringify(cookieValue));
    	}
		is_close = true;
		if(!is_create) showNotification("Update profile success");
		else showNotification("Create user success");
    },function(err){
    	hideLoading('modalSave');
    	showNotification("Update profile fail");
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
	apiDELETE("api/cms/user",{id_user:id_delete},function(data){
		is_close = true;
		showNotification("De-Activate user success");
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