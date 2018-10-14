var tools_routes = require(__dirname+"/../tools/tools_routes");
var tools_api = require(__dirname+"/../tools/tools_api");
var tools_db = require(__dirname+"/../tools/tools_db");
var tools_all = require(__dirname+"/../tools/tools_all");
var config = require(__dirname+"/../config");
var lang = require(__dirname+"/../language");
var router = tools_routes.init();

router.hook('patch','/',['admin'],['id','text','site','index'],function(req,res,role,next){
	var param = req.query;
	tools_db.one('SELECT * FROM table_ads WHERE id=${id}',param,function(row){
		var ads = row.ads;
		var ad = row.ads[param.index];
		ad.text = param.text;
		ad.site = param.site;
		if(typeof param.image!=='undefined'&&param.image!==''){
			ad.image = param.image;
		}
		ads[param.index] = ad;
		param.ads = JSON.stringify(ads);
		tools_db.one('UPDATE table_ads SET ads=${ads} WHERE id=${id} RETURNING id',param,function(data){
			tools_api.success200(res);
		},function(err){
			tools_api.error422(req,res,lang.home_ads.c);
		});
	},function(err){
		tools_api.error422(req,res,lang.home_ads.c);
	});
});

router.hook('delete','/row',['admin'],['row'],function(req,res,role,next){
	var param = req.query;
	tools_db.one('DELETE FROM table_ads WHERE id IN (SELECT raw.id FROM (SELECT id, row_number() over() AS row FROM (SELECT * FROM table_ads WHERE is_active=TRUE ORDER BY id ASC) raw) raw WHERE raw.row=${row}) RETURNING id',param,function(data){
		tools_api.success200(res);
	},function(err){
		tools_api.error422(req,res,lang.generic.b);
	});
});

router.hook('put','/row',['admin'],[],function(req,res,role,next){
	var param = {id_user:req.token_access.id};
	tools_db.one('INSERT INTO table_ads (id_user) VALUES (${id_user}) RETURNING id',param,function(data){
		tools_api.success200(res);
	},function(err){
		tools_api.error422(req,res,lang.home_ads.d);
	});
});

router.hook('put','/',['admin'],['id','text','site','image'],function(req,res,role,next){
	var param = req.query;
	tools_db.one('SELECT * FROM table_ads WHERE id=${id}',param,function(row){
		var ads = row.ads;
		var ad = {
			text:param.text,
			site:param.site,
			image:param.image
		}
		ads.push(ad);
		param.ads = JSON.stringify(ads);
		tools_db.one('UPDATE table_ads SET ads=${ads} WHERE id=${id} RETURNING id',param,function(data){
			tools_api.success200(res);
		},function(err){
			tools_api.error422(req,res,lang.home_ads.c);
		});
	},function(err){
		tools_api.error422(req,res,lang.home_ads.c);
	});
});

router.hook('get','/',['admin'],[],function(req,res,role,next){
	tools_db.manyOrNone('SELECT * FROM table_ads WHERE is_active=TRUE ORDER BY id ASC',undefined,function(ads){
		req.app.render('gen_ads', {rows: ads}, function(err, html) {
			console.log(html);
			tools_api.ok200(res,{ads:ads,html:html});
		});
		
	},function(err){
		tools_api.error422(req,res,lang.home_ads.a);
	});
});

router.hook('delete','/',['admin'],['id','index'],function(req,res,role,next){
	var param = req.query;
	tools_db.one('SELECT * FROM table_ads WHERE id=${id}',param,function(row){
		console.log(row.ads);
		console.log("A");
		var ads = row.ads;
		console.log("B");
		ads.splice(param.index, 1);
		console.log("C");
		param.ads = JSON.stringify(ads);
		console.log("D");
		tools_db.one('UPDATE table_ads SET ads=${ads} WHERE id=${id} RETURNING id',param,function(data){
			tools_api.success200(res);
		},function(err){
			tools_api.error422(req,res,lang.home_ads.b);
		});
		
	},function(err){
		tools_api.error422(req,res,lang.home_ads.b);
	});
});

module.exports = router.router;
