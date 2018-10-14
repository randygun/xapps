var tools_routes = require(__dirname+"/../tools/tools_routes");
var tools_api = require(__dirname+"/../tools/tools_api");
var tools_db = require(__dirname+"/../tools/tools_db");
var tools_all = require(__dirname+"/../tools/tools_all");
var config = require(__dirname+"/../config");
var lang = require(__dirname+"/../language");
var router = tools_routes.init();
var pg = require ('pg');
var pgConString = "postgres://"+config.db.username+":"+config.db.password+"@"+config.db.server+":5432/"+config.db.db;

router.hook('get','/',['admin'],[],function(req,res,role,next){
	//AMBIL CONCURRENT.
	//AMBIL REGISTERED SELLER
	//AMBIL REGISTERED BUYER
	//AMBIL UNVERIFIED BUYER
	var print = {};
	var query = 3;
	var iteration = 0;

	var pool = function(){
		iteration++;
		if(iteration>=query){
			tools_api.ok200(res,{home:print});
		}
	}

	var param = {
		role_buyer: config.dynamic.role.buyer,
		role_seller: config.dynamic.role.seller,
		potentialbuyer: 'potentialbuyer'
	};
	tools_db.manyOrNone('SELECT ST_Y(location.geom_location::geometry) AS lat,ST_X(location.geom_location::geometry) AS lng,store.id FROM table_store store LEFT JOIN table_location_gps location ON location.id=store.id_location WHERE store.is_delete=FALSE',undefined,function(locations){
		print.locations = locations;
		pool();
	},function(err){
		tools_api.error422(req,res,lang.home.a);
	});
	tools_db.one('SELECT COUNT(CASE WHEN id_role=${role_buyer} AND LEFT(username,14)!=${potentialbuyer} THEN 1 END) AS cntbuyerverified,COUNT(CASE WHEN id_role=${role_buyer} AND LEFT(username,14)=${potentialbuyer} THEN 1 END) AS cntbuyerunverified,COUNT(CASE WHEN id_role=${role_seller} THEN 1 END) AS cntseller FROM table_user WHERE is_delete=FALSE',param,function(cnt){
		print.count_verified = cnt.cntbuyerverified;
		print.count_unverified = cnt.cntbuyerunverified;
		print.count_seller = cnt.cntseller;
		pool();
	},function(err){
		tools_api.error422(req,res,lang.generic.a);
	});

	//CONCURRENT
	var cpuCount = require('os').cpus().length;
	var worker_special = JSON.parse(config.setting.worker_special);
	var controlC = cpuCount-worker_special.length;
	var control = {};
	for(var i=0;i<controlC;i++){
		control[i] = false;
	}
	var controlI = 0;
	var concurrent_api = 0;
	var replyConcurrent = function(data){
		if(control[data.core])return;
		control[data.core] = true;
		concurrent_api += parseInt(data.concurrent_api);
		controlI++;
		if(controlI>=controlC){
			//DONE
			print.concurrent = {
				api:concurrent_api
			};
			pool();
		}
	};
	pg.connect(pgConString, function(err, client, done) {
		if(err) {
		    console.log('PGCONNECT FAIL'+err);
		    tools_api.error422(req,res,lang.generic.a);
		    return;
		}
		client.on('notification', function(msg) {
			var notification = JSON.parse(msg.payload);
		    if(notification.job==="ask_concurrent_count_reply"){
		    	replyConcurrent(notification);
		    };
		});
		client.on('error',function(err){
			console.log("PGNOTIFICATION WATCH ERROR "+JSON.stringify(err));
		});
		var query = client.query("LISTEN watch_system");
		tools_db.one('INSERT INTO table_concurrent_request (time_create) VALUES (NOW()) RETURNING id',undefined,function(data){},function(err){});
	});

});

module.exports = router.router;
