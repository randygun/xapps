var map;
var marker = null;

var addMarker = function(latlng){
	var bounds = new google.maps.LatLngBounds();
	if(marker!==null) marker.setMap(null);
	marker = new google.maps.Marker({
		position: latlng,
		animation: google.maps.Animation.DROP,
		map: map
	});
	bounds.extend(marker.position);
	map.fitBounds(bounds);
}

function initMap() {
	console.log("AA");
	var indonesia = {lat: 15.064469, lng: 93.157337};
	map = new google.maps.Map(document.getElementById('map'), {
		zoom: 4,
		center: indonesia
	});
	console.log("BB");
	return;
}