$(document).ready(function() {
	showLoading();
	apiGET("api/user",{},function(data){
		$("#user_member_since").html(data.user.time_create1);
		$("#user_last_update").html(data.user.time_update1);
		hideLoading();
	},function(err){
		hideLoading();
	});
});

var avatarButton = function(){
	$('#fakeavatar').click();
};

$('#fakeavatar').on('click', function(){
	$(this).get(0).value = null;
});

$('#fakeavatar').on('change', function(){
  var files = $(this).get(0).files;
  if (files.length > 0){
  	is_success = false;
    // One or more files selected, process the file upload
    $('.progress').attr('style','');
	$('.progress-bar').text('0%');
    $('.progress-bar').width('0%');
    var formData = new FormData();
    // loop through all the selected files
    for (var i = 0; i < files.length; i++) {
      var file = files[i];
      // add the files to formData object for the data payload
      formData.append('fakeavatar', file, file.name);
    }
    showLoading();
    apiFILE("api/upload",formData,function(data){
    	if(data.uploaded.fakeavatar.length>0){
	    	avatar = data.uploaded.fakeavatar[0];
	    	$("#avatarModal").modal("show");
    	}else{
    		hideLoading();
    		showNotification("Unable to send new avatar");
    	}
    },function(err){
    	showNotification("Update avatar fail");
    });
  }else{
  	$('.progress').attr('style','display: none;');
	$('.progress-bar').text('0%');
    $('.progress-bar').width('0%');
  }
});

var avatar = "";

var changeAvatar = function(){
	var password_old = $("#currentpassword_avatar").val();
	apiPOST("api/user",{avatar:avatar,password_old:password_old},function(data){
		var cookieValue = JSON.parse(Cookies.get(js_cms_project));
		cookieValue.avatar = data.avatar;
		Cookies.set(js_cms_project,JSON.stringify(cookieValue));
		is_success = true;
		showNotification("Avatar successfully changed");
	},function(err){
		is_success = false;
		hideLoading();
		showNotification("Fail to change avatar");
	});
};

var is_success = false;

var changeUsername = function(){
	var username = $("#username").val();
	var password_old = $("#currentpassword_username").val();
	showLoading();
	apiPOST("api/user",{username:username,password_old:password_old},function(data){
		var cookieValue = JSON.parse(Cookies.get(js_cms_project));
		cookieValue.username = data.username;
		Cookies.set(js_cms_project,JSON.stringify(cookieValue));
		is_success = true;
		showNotification("Username successfully changed");
	},function(err){
		is_success = false;
		hideLoading();
		showNotification("Fail to change username");
	});
};

var changePassword =function(){
	is_success = false;
	var password_new = $("#password_new").val();
	var password_new_confirm = $("#password_new_confirm").val();
	var password_old = $("#password_old").val();
	if(password_new!==password_new_confirm || password_new.length < 8){
		showNotification("New password not match or less than 8 characters");
		return;
	}
	showLoading();
	apiPOST("api/user",{password_new:password_new,password_old:password_old},function(data){
		is_success = true;
		showNotification("Password successfully changed");
	},function(err){
		is_success = false;
		hideLoading();
		showNotification("Fail to change password");
	});
}

listenModal("avatarModal",function(){
	hideLoading();
	$('.progress').attr('style','display: none;');
	// $('#fakeavatar').files = [];
});

listenNotification(function(){
	//On Notification Closed
	if(is_success) location.reload();
	else hideLoading();
});