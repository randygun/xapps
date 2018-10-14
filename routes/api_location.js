var tools_routes = require(__dirname+"/../tools/tools_routes");
var tools_api = require(__dirname+"/../tools/tools_api");
var tools_db = require(__dirname+"/../tools/tools_db");
var tools_all = require(__dirname+"/../tools/tools_all");
var tools_email = require(__dirname+"/../tools/tools_email");
var config = require(__dirname+"/../config");
var lang = require(__dirname+"/../language");
var router = tools_routes.init();

var request = require('request');

router.hook('get','/history',['buyer'],[],function(req,res,role,next){
	var param = {id_user:req.token_access.id};
	//sebelumnya, planning nya query dari 1 table, tapi enaknya bagusnya query aja dari troli, 10 terakhir
	tools_db.manyOrNone('SELECT location.*, ST_X(location.geom_location::geometry) AS longitude, ST_Y(location.geom_location::geometry) AS latitude,ttc.destination_remark AS description FROM table_trolley_confirm ttc LEFT JOIN table_location_gps location ON location.id=ttc.id_destination WHERE ttc.id_customer=${id_user} ORDER BY ttc.id DESC LIMIT 10 OFFSET 0',param,function(location_history){
		tools_api.ok200(res,{location_history:location_history});
	},function(err){
		tools_api.error422(req,res,lang.location.a);
	});
	// tools_db.manyOrNone('SELECT location.*, ST_X(location.geom_location::geometry) AS longitude, ST_Y(location.geom_location::geometry) AS latitude FROM table_location_history history LEFT JOIN table_location_gps location ON location.id=history.id_location WHERE history.id_user=${id_user} ORDER BY history.id DESC LIMIT 10 OFFSET 0',param,function(location_history){
	// 	tools_api.ok200(res,{location_history:location_history});
	// },function(err){
	// 	tools_api.error422(req,res,lang.location.a);
	// });
});

router.hook('get','/address',['buyer'],['latitude','longitude','id_destination'],function(req,res,role,next){
	var param = req.query;
	request({ method: 'GET', url: "http://maps.googleapis.com/maps/api/geocode/json?latlng="+param.latitude+","+param.longitude}, function(err, remoteResponse, remoteBody) {
    	if (err) { 
			tools_api.error422(req,res,lang.address.a);
			return;
        }
        var result = {};
        try{
	        result = JSON.parse(remoteBody);
        }catch(err){
        	tools_api.error422(req,res,lang.address.a);
        	return;
        }
        // console.log('remoteBody '+JSON.stringify(remoteBody));
        if(result.results.length===0){
        	tools_api.error422(req,res,lang.address.a);
			return;
        }

        var route = null;
        var administrative_area_level_4 = null;
        var administrative_area_level_3 = null;
        var administrative_area_level_2 = null;
        var administrative_area_level_1 = null;
        var country = null;
        var postal_code = null;

        result.results[0].address_components.forEach(function(item){
        	item.types.forEach(function(key){
        		if(key==="route"){
        			route = item.long_name.replace(/[0-9]/g, '').trim();
        		}else if(key==="administrative_area_level_4"){
        			administrative_area_level_4 = item.long_name;
        		}else if(key==="administrative_area_level_3"){
        			administrative_area_level_3 = item.long_name;
        		}else if(key==="administrative_area_level_2"){
        			administrative_area_level_2 = item.long_name;
        		}else if(key==="administrative_area_level_1"){
        			administrative_area_level_1 = item.long_name;
        		}else if(key==="country"){
        			country = item.long_name;
        		}else if(key==="postal_code"){
        			postal_code = item.long_name;
        		}
        	});
        });
        var arrAddr = [];
        if(route!==null){
        	arrAddr.push(route);
        }
        if(administrative_area_level_4!==null){
        	arrAddr.push(administrative_area_level_4);
        }
        if(administrative_area_level_3!==null){
        	arrAddr.push(administrative_area_level_3);
        }
        if(administrative_area_level_2!==null){
        	arrAddr.push(administrative_area_level_2);
        }
        if(administrative_area_level_1!==null){
        	if(postal_code!==null){
        		administrative_area_level_1 += " "+postal_code;
	        }
        	arrAddr.push(administrative_area_level_1);
        }
        if(country!==null){
        	arrAddr.push(country);
        }

        param.address = arrAddr.join(', ');
        // param.address = result.results[0].formatted_address;
        tools_db.one('UPDATE table_location_gps SET name=${address} WHERE id=${id_destination} RETURNING id',param,function(data){
	        tools_api.ok200(res,{location_address:{address:param.address}});
        },function(err){
        	tools_api.error422(req,res,lang.address.a);
        });
    });
});

router.hook('get','/measure',['buyer'],['latitude_origin','latitude_destination','longitude_origin','longitude_destination'],function(req,res,role,next){
	var param = req.query;
	var destinations = [];
	var destination = {lat: param.latitude_destination, lng: param.longitude_destination};
	destinations.push(destination);
	var origins = [];
	var origin = {lat: param.latitude_origin, lng: param.longitude_origin};
	origins.push(origin);
	var googleMapsClient = require('@google/maps').createClient({
	  key: config.setting.key_googlemaps
	});
	var paramMap = {
	  origins: origins,
	  destinations: destinations,
	  language: 'en',
	  units: 'metric',
	  region: 'id',
	  timeout: 10000
	};
	googleMapsClient.distanceMatrix(paramMap,function(err,done){
		console.log("DONE:"+JSON.stringify(done));
		if(err){
			console.log('ERRMAP: '+err+';;;'+JSON.stringify(paramMap)+';;;'+config.setting.key_googlemaps);
			tools_db.one('SELECT ST_Distance(ST_GeogFromText(\'SRID=4326;POINT('+param.longitude_destination+' '+param.latitude_destination+')\'),	ST_GeogFromText(\'SRID=4326;POINT('+param.longitude_origin+' '+param.latitude_origin+')\'), false) AS distance',undefined,function(data){
				tools_api.ok200(res,{location_measure:{distance:parseInt(data.distance)}});
			},function(err){
				tools_api.error422(req,res,lang.store_nearby.a);
			});
			// tools_api.error422(req,res,lang.store_nearby.a);
			return;
		}
		if(done.json.rows.length===0){
			tools_api.error422(req,res,lang.store_nearby.a);
			return;
		}
		console.log("ELEMENTS:"+JSON.stringify(done.json.rows[0].elements));
		// data.elements = done.json.rows[0].elements;
		var distance = parseInt(done.json.rows[0].elements[0].distance.value);
		tools_api.ok200(res,{location_measure:{distance:distance}});
	});
});

router.hook('put','/',['buyer'],['longitude','latitude'],function(req,res,role,next){
	var param = req.query;
	param.id_user = req.token_access.id;
	tools_db.one("INSERT INTO table_location_gps (name,id_user,geom_location) VALUES (${address},${id_user},ST_GeographyFromText('SRID=4326;POINT("+param.longitude+" "+param.latitude+")')) RETURNING id",param,function(location){
		tools_api.ok200(res,{location:location});
	},function(err){
		tools_api.error422(req,res,lang.location.d);
	});
});

router.hook('post','/history',['buyer'],['name','description','longitude','latitude'],function(req,res,role,next){
	var param = req.body;
	param.id_user = req.token_access.id;
	tools_db.one("INSERT INTO table_location_gps (name,description,geom_location,id_user) VALUES (${name},${description},ST_GeographyFromText('SRID=4326;POINT("+param.longitude+" "+param.latitude+")'),${id_user}) RETURNING id",param,function(location){
		param.id_location = location.id;
		tools_db.one('INSERT INTO table_location_history (id_location,id_user) VALUES (${id_location},${id_user}) RETURNING id',param,function(location_history){
			tools_api.ok200(res,{location_history:location_history})
		},function(err){
			tools_api.error422(req,res,lang.location.c);
		});
	},function(err){
		tools_api.error422(req,res,lang.location.b);
	});
});

module.exports = router.router;