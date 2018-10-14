hookOnReady(function(){
	prepareSelect2('searchStore','api/cms/store/search',function(id){
		var latlng = JSON.parse(atob(id));
		var bounds = new google.maps.LatLngBounds();
		bounds.extend(latlng);
		map.fitBounds(bounds);
	});
	apiGET('api/cms/home',{},function(data){
		console.log('SUCCESS '+JSON.stringify(data)+data.home.user_registered);
		// $("#user_registered").html(data.home.user_registered);
		// $("#kids").html(data.home.kids);
		// $("#watches").html(data.home.watches);
		// $("#fences").html(data.home.fences);
		// $("#concurrent_api").html(data.home.concurrent.api);
		// $("#concurrent_net").html(data.home.concurrent.net);
		// $("#concurrent_io").html(data.home.concurrent.io);
		fillTheMap(data.home.locations);
		$("#concurrent_api").html(parseInt(data.home.concurrent.api).formatMoney(0)+" conn");
		$("#registeredseller").html(parseInt(data.home.count_seller).formatMoney(0)+" user");
		$("#registeredbuyer").html(parseInt(data.home.count_verified).formatMoney(0)+" user");
		$("#unregisteredbuyer").html(parseInt(data.home.count_unverified).formatMoney(0)+" user");
	},function(err){
		console.log('ERR');
	});
});