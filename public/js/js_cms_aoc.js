// if($("#table_gateout > tbody:first > tr:first").length===0)
//       $("#table_gateout > tbody").html(getContent(data));
//     else
//       $("#table_gateout > tbody:first > tr:first").eq(0).before(getContent(data));

var data_existing;

var url_aoc = "api/aoc";
var url_aoc = "api/external/aoc";

var showDetails = function(id){
	data_existing.offers.forEach(function(offer){
		if(parseInt(id)===parseInt(offer.id)){
			// alert(JSON.stringify(offer));
			$("#id").val(offer.id);
			$("#name").val(offer.name);
			$("#description").val(offer.description);
			$("#previewUrl").val(offer.previewUrl);
			$("#previewURL").attr("href",offer.previewUrl);
			$("#incent").val(offer.incent);
			$("#payoutType").val(offer.payoutType);
			$("#payout").val(offer.payout);
			$("#currency").val(offer.currency);
			$("#storeId").val(offer.storeId);
			$("#noticePeriod").val(offer.noticePeriod);
			$("#status").val(offer.status);
			var creatives = "";
			offer.creatives.forEach(function(creative){
				creatives += "<div class='col-xs-12'><div class='input-group'><input disabled class='form-control' type='text' value='"+creative+"'><span class='input-group-addon'><a target='_blank' href='"+creative+"'>visit</a></span></div></div>";
			});
			if(creatives==="") creatives = "<input disabled class='form-control' type='text' value='-'>";
			$("#creatives").html(creatives);
			var browsers = "";
			offer.browser.forEach(function(browser){
				browsers += "<input disabled class='form-control' type='text' value='"+browser+"'>";
			});
			if(browsers==="") browsers = "<input disabled class='form-control' type='text' value='-'>";
			$("#browsers").html(browsers);
			var devices = "";
			offer.device.forEach(function(device){
				devices += "<input disabled class='form-control' type='text' value='"+device+"'>";
			});
			if(devices==="") devices = "<input disabled class='form-control' type='text' value='-'>";
			$("#devices").html(devices);
			var oss = "";
			offer.os.forEach(function(os){
				oss += "<input disabled class='form-control' type='text' value='"+os+"'>";
			});
			if(oss==="") oss = "<input disabled class='form-control' type='text' value='-'>";
			$("#oss").html(oss);
			$("#osVersionMinimum").val(offer.osVersionMinimum);
			var countries = "";
			offer.countries.forEach(function(country){
				countries += "<input disabled class='form-control' type='text' value='"+country+"'>";
			});
			if(countries==="") countries = "<input disabled class='form-control' type='text' value='-'>";
			$("#countries").html(countries);
			$("#trackingUrl").val(offer.trackingUrl);
			$("#approved").val(offer.approved);
			$("#downloadType").val(offer.downloadType);
			$("#monthlyCap").val(offer.monthlyCap);
			$("#dailyCap").val(offer.dailyCap);
			$("#dailyCapsRemaining").val(offer.dailyCapsRemaining);
			$("#detailModal").modal("show");
		}
	});
	
}
var showPick = function(id){
	if(typeof id === "undefined"){
		//Ambil dari input id
		id = $("#id").val();
	}
	var offer_selected = null;
	data_existing.offers.forEach(function(offer){
		if(parseInt(id)===parseInt(offer.id)){
			offer_selected = offer;
			// alert(JSON.stringify(offer));
		}
	});
	if(offer_selected===null) showNotification("Can not find offer");
	else if(!offer_selected.approved) showNotification("Ads not approved by AOC");
	else if(offer_selected.trackingUrl===null) showNotification("No Tracking URL Available");
	else if(offer_selected.status==="inactive") showNotification("Ads is in inactive state");
	else 
		{
			showLoading();
			$("#detailModal").modal("hide");
			apiPOST(url_aoc,offer_selected,function(data){
				goTo("campaign?id="+data.aoc.id);
			},function(err){
				hideLoading();
			});
		}
};

var processPick = function(offer){

};

var getContent =function(data){
  return "<tr style='border-bottom: 1px solid #ccc;' id='"+data.id+"'><td>"+data.name+"</td><td>"+data.incent+"</td><td>"+data.payoutType+"</td><td>"+data.payout+" "+data.currency+"</td><td>"+data.noticePeriod+"</td><td>"+data.status+"</td><td>"+data.approved+"</td><td>"+data.downloadType+"</td><td>"+data.monthlyCap+"</td><td>"+data.dailyCap+"</td><td><a href='#details' onclick='showDetails("+data.id+");'>details</a>&nbsp;|&nbsp;<a href='#pick' onclick='showPick("+data.id+");'>pick!</a></td></tr>";
}

hookOnReady(function(){
	showLoading();
	// apiGET("api/external/aoc",{},function(data){
	apiGET(url_aoc,{},function(data){
		data_existing = data;
		var content = "";
		data.offers.forEach(function(row){
			content += getContent(row);
		});
		$("#tableAOC > tbody").html(content);
		$("#tableAOC").DataTable();
		hideLoading();
	},function(err){
		showNotification("Unable fetch data");
	});
});