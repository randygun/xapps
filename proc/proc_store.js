module.exports = this;
var instance = this;
var tools_api = require(__dirname+"/../tools/tools_api");
var tools_db = require(__dirname+"/../tools/tools_db");
var tools_all = require(__dirname+"/../tools/tools_all");
var tools_email = require(__dirname+"/../tools/tools_email");
var config = require(__dirname+"/../config");
var lang = require(__dirname+"/../language");

this.product = function(req,res,id_store,callback,special_parameter){
	var days = ['sun','mon','tue','wed','thu','fri','sat'];
	var now = new Date();
	var day = days[ now.getDay() ];
	var is_store = false;
	if(typeof special_parameter === "undefined") {
		special_parameter = {};
	}else{
		if(typeof special_parameter.is_store !=='undefined' && special_parameter.is_store){
			is_store = true;
		}
	}

	special_parameter.waiting = true;
	var param = req.query;
	var fulltextSearch = '';
	console.log('product query ');
	if(typeof param.search !== 'undefined' && param.search !== '' && !is_store){
		param.search = tools_all.filterSearch(param.search);
		fulltextSearch = "AND (to_tsvector('simple',category.name || ' ' || category.description)@@to_tsquery('simple','"+param.search+"')\n\
		OR to_tsvector('simple',product.name || ' ' || product.description)@@to_tsquery('simple','"+param.search+"'))";
	}
	console.log('Full text search '+fulltextSearch);
	tools_api.paginationSupport(req,res,"\n\
		SELECT product.*,trolley.qty AS trolley_qty \n\
		FROM table_product_category category\n\
		LEFT JOIN table_store store ON store.id=category.id_store\n\
		LEFT JOIN table_schedule sched ON sched.id=store.id_schedule\n\
		LEFT JOIN table_product product ON product.id_category=category.id\n\
		LEFT JOIN (SELECT * FROM table_trolley WHERE id_user="+req.token_access.id+") trolley ON trolley.id_product=product.id\n\
		WHERE store.is_delete=FALSE AND product.is_active=TRUE AND product.is_delete=FALSE AND category.id_store="+id_store+" "+fulltextSearch+" \n\
		ORDER BY product.id ASC",'products',function(data){
			console.log("TERIMA DATA "+JSON.stringify(data));
			callback(id_store,data);
	},undefined,special_parameter);
};

this.nearby = function(req,res,special){
	var days = ['sun','mon','tue','wed','thu','fri','sat'];
	var now = new Date();
	var day = days[ now.getDay() ];
	var pagination = {};
	var param = req.query;
	var sorted = [];
	param.distance = config.setting.distance_max;
	var special_store = '(SELECT store.*,FALSE AS is_store,COALESCE(rating.rating,0) AS rating FROM table_store store LEFT JOIN (SELECT AVG(paid.rating)::bigint AS rating,confirm.id_store FROM table_trolley_paid paid LEFT JOIN table_trolley_confirm_agree agree ON agree.id=paid.id_agree LEFT JOIN table_trolley_confirm confirm ON confirm.id=agree.id_confirm WHERE paid.rating IS NOT NULL GROUP BY confirm.id_store) rating ON rating.id_store=store.id WHERE store.is_delete=FALSE)';
	var special_product = false;
	var special_page_max = undefined;
	if(typeof special!=='undefined'){
		if(typeof special.store !=='undefined'){
			special_store = special.store;
		}
		if(typeof special.product !== 'undefined'){
			special_product = special.product;
		}
	}else{
		special_page_max = null;
	}
	var iPrintMax = 0;
	var iPrint = 0;
	var datas = [];
	var print = function(){
		iPrint++;
		if(iPrint>=iPrintMax){
			sorted = datas.store_nearby.sort(function(a,b){
				return a.distance_google - b.distance_google;
			});
			tools_api.ok200(res,{store_nearby:sorted,pagination:pagination});
		}
	};
	var sql = "\n\
		SELECT grouping.rating,grouping.is_store, CASE WHEN sched.time_open<NOW()::time AND sched.time_close>NOW()::time AND sched."+day+"=TRUE AND store.is_open=TRUE THEN TRUE ELSE FALSE END AS is_store_active,store.*,ST_X(location.geom_location::geometry) AS location_longitude,ST_Y(location.geom_location::geometry) AS location_latitude,ST_Distance(location.geom_location, ST_GeographyFromText('SRID=4326;POINT("+param.longitude+" "+param.latitude+")')) AS distance_db,"+param.distance+" AS distance_max_meter \n\
		FROM "+special_store+" grouping\n\
		LEFT JOIN table_store store ON store.id=grouping.id\n\
		LEFT JOIN table_schedule sched ON sched.id=store.id_schedule\n\
		LEFT JOIN table_location_gps location ON location.id=store.id_location\n\
		LEFT JOIN (SELECT AVG(rating) AS counted, id_store FROM table_store_rating GROUP BY id_store) rating ON rating.id_store=store.id\n\
		WHERE store.is_delete=FALSE AND ST_DWithin(location.geom_location, ST_GeographyFromText('SRID=4326;POINT("+param.longitude+" "+param.latitude+")'), "+param.distance+") \n\
		ORDER BY ST_Distance(location.geom_location, ST_GeographyFromText('SRID=4326;POINT("+param.longitude+" "+param.latitude+")')) ASC LIMIT 50 OFFSET 0";
	tools_api.paginationSupport(req,res,sql,'store_nearby',function(data){
		pagination = data.pagination;
		if(data.store_nearby.length===0){
			tools_api.ok200(res,data);
			return;
		}
		iPrintMax = 1;
		var checker =function(id_store,products){
			var j = 0;
			var found = false;
			data.store_nearby.forEach(function(store){
				if(parseInt(store.id)===parseInt(id_store)){
					data.store_nearby[j].products = products.products;
					found = true;
					print();
					return;
				}
				j++;
			});
			if(found)return;
			print();
		};
		if(special_product){
			iPrintMax = iPrintMax+data.store_nearby.length;
			data.store_nearby.forEach(function(store){
				console.log('Register search store '+store.id+";"+store.is_store);
				instance.product(req,res,store.id,checker,{page_go:0,is_store:store.is_store});
			});
		};
		console.log("HALO "+JSON.stringify(data));
		var destinations = [];
		var destination = {lat: param.latitude, lng: param.longitude};
		destinations.push(destination);
		var origins = [];
		data.store_nearby.forEach(function(row){
			origins.push({lat: row.location_latitude, lng: row.location_longitude});
		});
		var googleMapsClient = require('@google/maps').createClient({
		  key: config.setting.key_googlemaps
		});
		googleMapsClient.distanceMatrix({
		  origins: origins,
		  destinations: destinations,
		  language: 'en',
		  units: 'metric',
		  region: 'id',
		  timeout: 10000
		},function(err,done){
			console.log("ERR:"+JSON.stringify(err));
			console.log("DONE:"+JSON.stringify(done));
			if(err){
				// tools_api.error422(req,res,lang.store_nearby.a);
				var i = 0;
				data.store_nearby.forEach(function(row){
					data.store_nearby[i].distance_google = row.distance_db;
					i++;
				});
				datas = data;
				print();
				return;
			}
			if(done.json.rows.length===0){
				tools_api.error422(req,res,lang.store_nearby.a);
				return;
			}
			console.log("ELEMENTS:"+JSON.stringify(done.json.rows[0].elements));
			// data.elements = done.json.rows[0].elements;
			var i = 0;
			done.json.rows.forEach(function(row){
				data.store_nearby[i].distance_google = row.elements[0].distance.value;
				i++;
			});
			// done.json.rows[0].elements.forEach(function(row){
			// 	data.store_nearby[i].distance_google = row.distance.value;
			// 	i++;
			// });
			datas = data;
			print();
		});
		
	},undefined,{waiting:true,page_max:special_page_max});
};