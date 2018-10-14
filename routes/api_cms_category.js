var tools_routes = require(__dirname+"/../tools/tools_routes");
var tools_cms = require(__dirname+"/../tools/tools_cms");
var tools_api = require(__dirname+"/../tools/tools_api");
var tools_db = require(__dirname+"/../tools/tools_db");
var tools_all = require(__dirname+"/../tools/tools_all");
var config = require(__dirname+"/../config");
var lang = require(__dirname+"/../language");
var router = tools_routes.init();

router.hook('delete','/',['admin'],['id_category'],function(req,res,role,next){
	var param = req.query;
	tools_db.one('DELETE FROM template_product_category WHERE id=${id_category} RETURNING id',param,function(data){
		tools_api.success200(res);
	},function(err){
		tools_api.error422(req,res,lang.category.c);
	});
});

router.hook('get','/',['admin'],['id_category'],function(req,res,role,next){
	var param = req.query;
	tools_db.one('SELECT * FROM template_product_category WHERE id=${id_category}',param,function(category){
		tools_api.ok200(res,{category:category});
	},function(err){
		tools_api.error422(req,res,lang.category.a);
	});
});

router.hook('put','/',['admin'],['name','description'],function(req,res,role,next){
	var param = req.query;
	tools_db.one('INSERT INTO template_product_category (name,description) VALUES (${name},${description}) RETURNING id',param,function(category){
		tools_api.success200(res);
	},function(err){
		tools_api.error422(req,res,lang.category.a);
	});
});

router.hook('patch','/',['admin'],['name','description','id_category'],function(req,res,role,next){
	var param = req.query;
	tools_db.one('UPDATE template_product_category SET name=${name}, description=${description} WHERE id=${id_category} RETURNING id',param,function(category){
		tools_api.success200(res);
	},function(err){
		tools_api.error422(req,res,lang.category.a);
	});
});

module.exports = router.router;
