var googleMapsClient = require('@google/maps').createClient({
	key: 'AIzaSyDgIfPefRG4bplYPPJKxR_lj13nwkbpaTo'
});
var paramMap = {
	origins: [{"lat":"-6.15169530551388","lng":"106.890673153102"}],
	destinations: [{"lat":"-6.2954036","lng":"106.6709605"}],
	language: 'en',
	units: 'metric',
	region: 'id',
	timeout: 10000
};
googleMapsClient.distanceMatrix(paramMap,function(err,done){
	console.log("DONE:"+JSON.stringify(err));
	console.log("DONE:"+JSON.stringify(done));
});
console.log('RUNTEST');