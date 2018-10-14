function smoothZoom (map, max, cnt) {
    if (cnt >= max) {
        return;
    }
    else {
        z = google.maps.event.addListener(map, 'zoom_changed', function(event){
            google.maps.event.removeListener(z);
            smoothZoom(map, max, cnt + 1);
        });
        setTimeout(function(){map.setZoom(cnt)}, 250); // 80ms is what I found to work well on my system -- it might not work well on all systems
    }
}

var setBounds = function(map){

};

var genInfoWindow = function(param){
	var contentString = '<a href="'+js_cms_fullhost+'store/profile?mode=visit&id='+param.id+'"><center><h1>'+param.store.name+'</h1></center><center><h5>'+param.store.address+'</h5></center></a>';
	var infowindow = new google.maps.InfoWindow({
      content: contentString
    });
    return infowindow;
};

var tambahMarker = function(array,map,bounds){
	if(array.length===0) {
		map.fitBounds(bounds);
		return;
	}
	var item = array.splice(0,1)[0];
	var marker = new google.maps.Marker({
		position: item,
		animation: google.maps.Animation.DROP,
		map: map
	});
	marker.addListener('click', function() {
		apiGET('api/cms/store/profile',{id_store:item.id},function(data){
			item.store = data.store;
			genInfoWindow(item).open(map, marker);
		},function(err){
			showNotification('Unable Get Data');
		});
    });
	bounds.extend(marker.position);
	setTimeout(function(){
		tambahMarker(array,map,bounds);
	},25);
};

function fillTheMap(locations){
	var bounds = new google.maps.LatLngBounds();
	tambahMarker(locations,map,bounds);
}

var map;

function initMap() {

	var indonesia = {lat: -2.064469, lng: 118.157337};
	map = new google.maps.Map(document.getElementById('map'), {
		zoom: 5,
		center: indonesia
	});
	return;
}