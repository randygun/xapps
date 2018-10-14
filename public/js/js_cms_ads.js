var id_edit_index = 0;
var id_delete_index = 0;
var id_delete_row = 0;
var id_add_row = 0;
var id_edit_row = 0;
var url_image_add = "";
var url_image_edit = "";

listenNotification(function(){
	location.reload();
});

var confirmAddAds = function(){
	var siteUrl = $("#siteUrl").val();
	var name = $("#nameAds").val();
	if(url_image_add===""||siteUrl===""||name===""){
		showNotification('Please upload Name, Site URL, and Image');
	}else{
		apiPUT('api/cms/ads',{id:id_add_row,text:name,site:siteUrl,image:url_image_add},function(data){
			showNotification("Ads added");
		},function(err){
			showNotification("Unable add ads");
		});
	}
}

var addRow = function(){
	apiPUT('api/cms/ads/row',{},function(data){
		showNotification("Row added");
	},function(err){
		showNotification("Unable add ads row");
	});
};

var confirmEditAds = function(){
	var siteUrl = $("#siteUrlEdit").val();
	var name = $("#nameAdsEdit").val();
	if(siteUrl===""||name===""){
		showNotification('Please upload both Name and Site URL');
	}else{
		apiPATCH('api/cms/ads',{id:id_edit_row,index:id_edit_index,text:name,site:siteUrl,image:url_image_edit},function(data){
			showNotification("Ads edited");
		},function(err){
			showNotification("Unable edit ads");
		});
	}
}

var startProgress = function(){
	$('.progress').attr('style','');
	$('.progress-bar').text('0%');
    $('.progress-bar').width('0%');
};

var hideProgress = function(){
	$('.progress').attr('style','display: none;');
	$('.progress-bar').text('0%');
    $('.progress-bar').width('0%');
};

$('#adsImageEdit').on('change', function(){
  var files = $(this).get(0).files;
  if (files.length > 0){
  	url_image_edit = "";
  	is_success = false;
    // One or more files selected, process the file upload
    startProgress();
    var formData = new FormData();
    // loop through all the selected files
    for (var i = 0; i < files.length; i++) {
      var file = files[i];
      // add the files to formData object for the data payload
      formData.append('adsImageEdit', file, file.name);
    }
    showLoading();
    apiFILE("api/upload",formData,function(data){
    	if(data.uploaded.adsImageEdit.length>0){
	    	var picture = data.uploaded.adsImageEdit[0];
	    	url_image_edit = picture;
	    	console.log('PICTURE: '+picture);
	    	// $("#avatarModal").modal("show");
    	}else{
    		hideLoading();
    		showNotification("Unable upload ads picture");
    	}
    },function(err){
    	showNotification("Unable upload ads picture");
    	//93
    });
  }else{
  	hideProgress();
  }
});

$('#adsImage').on('change', function(){
  var files = $(this).get(0).files;
  if (files.length > 0){
  	url_image_add = "";
  	is_success = false;
    // One or more files selected, process the file upload
    startProgress();
    var formData = new FormData();
    // loop through all the selected files
    for (var i = 0; i < files.length; i++) {
      var file = files[i];
      // add the files to formData object for the data payload
      formData.append('adsImage', file, file.name);
    }
    showLoading();
    apiFILE("api/upload",formData,function(data){
    	if(data.uploaded.adsImage.length>0){
	    	var picture = data.uploaded.adsImage[0];
	    	url_image_add = picture;
	    	console.log('PICTURE: '+picture);
	    	// $("#avatarModal").modal("show");
    	}else{
    		hideLoading();
    		showNotification("Unable upload ads picture");
    	}
    },function(err){
    	showNotification("Unable upload ads picture");
    	//93
    });
  }else{
  	hideProgress();
  }
});

var confirmDeleteAds = function(){
	// alert(""+id_delete_row+";"+id_delete_index);
	apiDELETE('api/cms/ads',{id:id_delete_row,index:id_delete_index},function(data){
		showNotification("Ads deleted");
	},function(err){
		console.log('ERR');
	});
}

var removeAds = function(row){
  apiDELETE('api/cms/ads/row',{row:row},function(data){
    showNotification("Row deleted");
  },function(err){
    showNotification("Row delete fail");
  });
}

hookOnReady(function(){
	apiGET('api/cms/ads',{},function(data){
		$("#adscontainer").html(data.html);
	},function(err){
		console.log('ERR');
	});
});