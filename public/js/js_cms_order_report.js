var id = 0;

uploadSingleFileAutomatic('fileAttachment',function(data){
	id++;
	$("#attachments").append('<div id="att'+id+'"><a class="attachment" href="'+data+'" target="blank">'+data+'</a>&nbsp;&nbsp;&nbsp;(<a href="#remove" onclick="remove('+id+');">Remove</a>)<br></div>');
},function(err){
	alert(JSON.stringify(err));
});

var remove = function(id){
	$("#att"+id).remove();
};

var is_reload = false;

listenNotification(function(){
	if(is_reload) location.reload();
});

var finish = function(is_refund){
	var description = $("#description").val();
	var attachments = $("#attachments").html();
	var array_attachment = [];
	$('#attachments').children('div').each(function () {
		$(this).children('a').each(function () {
		    if($(this).attr('class')==='attachment') {
		    	var attachment = $(this).attr('href');
		    	console.log("AAAAA:"+attachment);
		    	array_attachment.push(attachment);
		    }
		});
	});
	apiPOST('api/cms/order/complain',{id_order:id_order,attachments:JSON.stringify(array_attachment),description:description,is_refund:is_refund},function(data){
		is_reload = true;
		showNotification('Insert complain success');
	},function(err){
		is_reload = false;
		showNotification('Unable insert complain');
	});
}

var saveDraft = function(){
	var description = $("#description").val();
	var attachments = $("#attachments").html();
	var array_attachment = [];
	$('#attachments').children('div').each(function () {
		$(this).children('a').each(function () {
		    if($(this).attr('class')==='attachment') {
		    	var attachment = $(this).attr('href');
		    	console.log("AAAAA:"+attachment);
		    	array_attachment.push(attachment);
		    }
		});
	});
	apiPOST('api/cms/order/complain/draft',{id_order:id_order,attachments:JSON.stringify(array_attachment),description:description},function(data){
		is_reload = true;
		showNotification('Save complaint draft success');
	},function(err){
		is_reload = false;
		showNotification('Unable save complaint draft');
	});
};

hookOnReady(function(){
	if(commission===null) commission = 0;
	var commission_calc = commissionPI*commission/100;
	if(commissionCI!==0) commission_calc = commissionCI*commission/100;
	var written = "<font color='darkred'>Commission: "+parseInt(commission_calc).formatMoney(0)+" ("+commission+"%)</font>";
	$("#commissionPI").html(written);
	$("#commissionCI").html(written);
	loadTable('listComplaints','api/cms/order/complain/'+id_order);
});