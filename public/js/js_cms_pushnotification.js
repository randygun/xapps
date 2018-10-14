
var is_reload = false;

var submitNotification = function(){
	is_reload = false;
	var title = $("#title").val();
	var message = $("#message").val();
	var recipient = $("#recipient").val();
	console.log(title);
	console.log(message);
	apiPOST("api/cms/pushnotification",
		{title:title,message:message,recipient:recipient},function(data){
			is_reload = true;
			showNotification("Message are on the queue to send");
	},function(err){
		is_reload = false;
		showNotification("Message are failed to send");
	});
}

listenNotification(function(){
	if(is_reload) location.reload();
})

hookOnReady(function(){
	loadTable('listNotification','api/cms/pushnotification');
});