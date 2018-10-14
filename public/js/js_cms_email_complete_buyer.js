var is_close = false;

listenNotification(function(){
	if(is_close) location.reload();
});

var save = function(){
	var content = $("#saved").val();
	apiPOST('api/cms/email',{file:'template_email_order_complete_buyer',content:content},function(data){
		is_close= true;
		showNotification('Email format saved');
	},function(err){
		is_close= false;
		showNotification('Email not saved');
	});
};