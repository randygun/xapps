var tools_routes = require(__dirname+"/../tools/tools_routes");
var tools_api = require(__dirname+"/../tools/tools_api");
var tools_db = require(__dirname+"/../tools/tools_db");
var tools_all = require(__dirname+"/../tools/tools_all");
var tools_email = require(__dirname+"/../tools/tools_email");
var config = require(__dirname+"/../config");
var lang = require(__dirname+"/../language");
var proc_store = require(__dirname+'/../proc/proc_store');
var router = tools_routes.init();

var proc = require(__dirname+'/../proc/proc_login');

router.hook('get','/nearby/product',['buyer'],['search'],function(req,res,role,next){
	var param = req.query;
	param.search = tools_all.filterSearch(param.search);	
	var sql = "\n\
		(SELECT \n\
		raw.*,COALESCE(rating.rating,0) AS rating FROM (SELECT \n\
		CASE WHEN to_tsvector('simple',store.name)@@to_tsquery('simple','"+param.search+"') THEN TRUE ELSE FALSE END AS is_store,\n\
		category.id_store AS id \n\
		FROM table_product_category category \n\
		LEFT JOIN table_product product ON product.id_category=category.id \n\
		LEFT JOIN table_store store ON store.id=category.id_store \n\
		WHERE product.is_active=TRUE AND product.is_delete=FALSE AND store.is_delete=FALSE AND (to_tsvector('simple',category.name || ' ' || category.description)@@to_tsquery('simple','"+param.search+"')\n\
		OR to_tsvector('simple',product.name || ' ' || product.description)@@to_tsquery('simple','"+param.search+"')\n\
		OR lower(CONCAT(category.name,' ',category.description,' ',store.name,' ',product.name)) LIKE '%"+param.search.toLowerCase()+"%'\n\
		OR to_tsvector('simple',store.name)@@to_tsquery('simple','"+param.search+"'))\n\
		GROUP BY category.id_store,store.name) raw\n\
		LEFT JOIN (SELECT AVG(paid.rating)::bigint AS rating,confirm.id_store FROM table_trolley_paid paid LEFT JOIN table_trolley_confirm_agree agree ON agree.id=paid.id_agree LEFT JOIN table_trolley_confirm confirm ON confirm.id=agree.id_confirm WHERE paid.rating IS NOT NULL GROUP BY confirm.id_store) rating ON rating.id_store=raw.id\n\
		)";
	proc_store.nearby(req,res,{store:sql,product:true});
});

router.hook('get','/:id_store/product',['buyer'],[],function(req,res,role,next){
	proc_store.product(req,res,req.params.id_store,function(id_store,data){
		tools_api.ok200(res,data);
	});
});

router.hook('get','/products',['seller','employee'],[],function(req,res,role,next){
	var param = req.query;
	var fulltextSearch = '';
	console.log('product query ');
	if(typeof param.search !== 'undefined' && param.search !== ''){
		param.search = tools_all.filterSearch(param.search);
		fulltextSearch = "AND (to_tsvector('simple',category.name || ' ' || category.description)@@to_tsquery('simple','"+param.search+"')\n\
		OR to_tsvector('simple',product.name || ' ' || product.description)@@to_tsquery('simple','"+param.search+"'))";
	}
	console.log('Full text search '+fulltextSearch);
	tools_api.paginationSupport(req,res,"SELECT product.*,category.name AS category FROM table_user usr LEFT JOIN table_product_category category ON category.id_store=usr.id_store LEFT JOIN table_product product ON product.id_category = category.id WHERE product.is_delete=FALSE AND category.id IS NOT NULL AND product.id IS NOT NULL AND usr.id_store IS NOT NULL AND usr.id="+req.token_access.id+" "+fulltextSearch,"products");
});

router.hook('patch','/is_open',['seller'],['value'],function(req,res,role,next){
	var param = {id_user:req.token_access.id};
	param.is_open = req.query.value;
	tools_db.one('SELECT id_store FROM table_user WHERE id=${id_user} AND id_store IS NOT NULL',param,function(user){
		param.id_store = user.id_store;
		if(param. is_open )tools_db.none('UPDATE table_trolley_confirm SET time_expire=(NOW()+ INTERVAL \'1 hour\') WHERE time_expire IS NULL AND id_store=${id_store}',param,function(){},function(err){});
		tools_db.one('UPDATE table_store SET is_open=${is_open} WHERE id=${id_store} RETURNING is_open',param,function(store){
			tools_api.ok200(res,store);
		},function(err){
			tools_api.error422(req,res,lang.storeupdate.b);
		});
	},function(err){
		tools_api.error422(req,res,lang.storeupdate.b);
	});
});

router.hook("patch","/avatar",['seller'],['new'],function(req,res,role,next){
	var param = {id_user:req.token_access.id};
	param.avatar = req.query.new;
	tools_db.one('SELECT id_store FROM table_user WHERE id=${id_user} AND id_store IS NOT NULL',param,function(user){
		param.id_store = user.id_store;
		tools_db.one('UPDATE table_store SET avatar=${avatar} WHERE id=${id_store} RETURNING avatar',param,function(store){
			tools_api.ok200(res,store);
		},function(err){
			tools_api.error422(req,res,lang.storeupdate.a);
		});
	},function(err){
		tools_api.error422(req,res,lang.storeupdate.a);
	});
});
router.hook("patch","/name",['seller'],['new'],function(req,res,role,next){
	var param = {id_user:req.token_access.id};
	param.name = req.query.new;
	tools_db.one('SELECT id_store FROM table_user WHERE id=${id_user} AND id_store IS NOT NULL',param,function(user){
		param.id_store = user.id_store;
		tools_db.one('UPDATE table_store SET name=${name} WHERE id=${id_store} RETURNING name',param,function(store){
			tools_api.ok200(res,{store:store});
		},function(err){
			tools_api.error422(req,res,lang.storeupdate.a);
		});
	},function(err){
		tools_api.error422(req,res,lang.storeupdate.a);
	});
});
router.hook("patch","/address",['seller'],['new'],function(req,res,role,next){
	var param = {id_user:req.token_access.id};
	param.address = req.query.new;
	tools_db.one('SELECT id_store FROM table_user WHERE id=${id_user} AND id_store IS NOT NULL',param,function(user){
		param.id_store = user.id_store;
		tools_db.one('UPDATE table_store SET address=${address} WHERE id=${id_store} RETURNING address',param,function(store){
			tools_api.ok200(res,{store:store});
		},function(err){
			tools_api.error422(req,res,lang.generic.b);
		});
	},function(err){
		tools_api.error422(req,res,lang.generic.b);
	});
});
router.hook("patch","/city",['seller'],['new'],function(req,res,role,next){
	var param = {id_user:req.token_access.id};
	param.city = req.query.new;
	tools_db.one('SELECT id_store FROM table_user WHERE id=${id_user} AND id_store IS NOT NULL',param,function(user){
		param.id_store = user.id_store;
		tools_db.one('UPDATE table_store SET city=${city} WHERE id=${id_store} RETURNING city',param,function(store){
			tools_api.ok200(res,{store:store});
		},function(err){
			tools_api.error422(req,res,lang.generic.b);
		});
	},function(err){
		tools_api.error422(req,res,lang.generic.b);
	});
});

router.hook("patch","/phone",['seller'],['new'],function(req,res,role,next){
	var param = {id_user:req.token_access.id};
	param.phone = req.query.new;
	tools_db.one('SELECT id_store FROM table_user WHERE id=${id_user} AND id_store IS NOT NULL',param,function(user){
		param.id_store = user.id_store;
		tools_db.one('UPDATE table_store SET phone=${phone} WHERE id=${id_store} RETURNING phone',param,function(store){
			tools_api.ok200(res,{store:store});
		},function(err){
			tools_api.error422(req,res,lang.storeupdate.a);
		});
	},function(err){
		tools_api.error422(req,res,lang.storeupdate.a);
	});
});

router.hook('patch','/workinghours',['seller'],['time_open','time_close','sun','mon','tue','wed','thu','fri','sat'],function(req,res,role,next){
	var param = req.query;
	param.time_open += ':00';
	param.time_close += ':59';
	param.id_user = req.token_access.id;
	tools_db.one('INSERT INTO table_schedule (time_open,time_close,sun,mon,tue,wed,thu,fri,sat) VALUES (${time_open},${time_close},${sun},${mon},${tue},${wed},${thu},${fri},${sat}) RETURNING *',param,function(schedule){
		param.id_schedule = schedule.id;
		tools_db.one('SELECT id_store FROM table_user WHERE id=${id_user} AND id_store IS NOT NULL',param,function(user){
			param.id_store = user.id_store;
			tools_db.one('UPDATE table_store SET id_schedule=${id_schedule} WHERE id=${id_store} RETURNING id',param,function(store){
				tools_api.ok200(res,schedule);
			},function(err){
				tools_api.error422(req,res,lang.storeupdate.c);
			});
		},function(err){
			tools_api.error422(req,res,lang.storeupdate.c);
		});
	},function(err){
		tools_api.error422(req,res,lang.storeupdate.c);
	});
});

router.hook("patch","/location",['seller'],['longitude','latitude'],function(req,res,role,next){
	var param = req.query;
	param.id_user = req.token_access.id;
	param.name = "Update Store Location";
	param.description = "User "+param.id_user;
	tools_db.one("INSERT INTO table_location_gps (name,description,geom_location) VALUES (${name},${description},ST_GeographyFromText('SRID=4326;POINT("+param.longitude+" "+param.latitude+")')) RETURNING id",param,function(location){
		param.id_location = location.id;
		tools_db.one('SELECT id_store FROM table_user WHERE id=${id_user} AND id_store IS NOT NULL',param,function(user){
			param.id_store = user.id_store;
			tools_db.one('UPDATE table_store SET id_location=${id_location},lock_location=TRUE WHERE id=${id_store} AND lock_location=FALSE RETURNING id',param,function(store){
				tools_api.success200(res);
			},function(err){
				tools_api.error422(req,res,lang.storeupdate.d);
			});
		},function(err){
			tools_api.error422(req,res,lang.storeupdate.d);
		});
	},function(err){
		tools_api.error422(req,res,lang.storeupdate.d);
	});
});

router.hook("get","/nearby",['buyer'],['longitude','latitude'],function(req,res,role,next){
	proc_store.nearby(req,res,undefined);
});

module.exports = router.router;