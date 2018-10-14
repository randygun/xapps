var tools_routes = require(__dirname+"/../tools/tools_routes");
var tools_api = require(__dirname+"/../tools/tools_api");
var tools_db = require(__dirname+"/../tools/tools_db");
var tools_all = require(__dirname+"/../tools/tools_all");
var tools_email = require(__dirname+"/../tools/tools_email");
var config = require(__dirname+"/../config");
var lang = require(__dirname+"/../language");
var router = tools_routes.init();

router.hook('patch','/:id_product/visibility',['seller','employee'],['value'],function(req,res,role,next){
	var param = req.params;
	param.is_active = req.query.value;
	tools_db.one('UPDATE table_product SET is_active=${is_active} WHERE id=${id_product} RETURNING id',param,function(product){
		tools_api.success200(res);
	},function(err){
		tools_api.error422(req,res,lang.product.c);
	});
});

router.hook('delete','/:id_product',['seller','employee'],[],function(req,res,role,next){
	var param = req.params;
	tools_db.one('UPDATE table_product SET is_delete=TRUE WHERE id=${id_product} RETURNING id',param,function(product){
		tools_api.success200(res);
	},function(err){
		tools_api.error422(req,res,lang.product.d);
	});
});

router.hook('put','/category',['seller'],['name','description'],function(req,res,role,next){
	var param = req.query;
	param.id_user = req.token_access.id;
	tools_db.one('SELECT id_store FROM table_user WHERE id=${id_user} AND id_store IS NOT NULL',param,function(user){
		param.id_store = user.id_store;
		tools_db.one('INSERT INTO table_product_category (name,description,id_store) VALUES (${name},${description},${id_store}) RETURNING id',param,function(category){
			tools_api.success200(res);
		},function(err){
			tools_api.error422(req,res,lang.category.b);
		});
	},function(err){
		tools_api.error422(req,res,lang.category.b);
	});
});
router.hook('patch','/category/:id_category',['seller'],['name','description'],function(req,res,role,next){
	var param = req.query;
	param.id_category = req.params.id_category;
	param.id_user = req.token_access.id;
	tools_db.one('UPDATE table_product_category SET name=${name},description=${description} WHERE id=${id_category} RETURNING id',param,function(user){
		tools_api.success200(res);
	},function(err){
		tools_api.error422(req,res,lang.category.b);
	});
});
router.hook('delete','/category/:id_category',['seller'],[],function(req,res,role,next){
	var param = req.params;
	param.id_user = req.token_access.id;
	tools_db.one('UPDATE table_product_category SET is_delete=TRUE WHERE id=${id_category} RETURNING id',param,function(user){
		tools_api.success200(res);
	},function(err){
		tools_api.error422(req,res,lang.category.b);
	});
});

router.hook('get','/categories',['seller','employee'],[],function(req,res,role,next){
	var param = {id_user:req.token_access.id};
	tools_db.manyOrNone('SELECT category.* FROM table_user usr LEFT JOIN table_product_category category ON category.id_store=usr.id_store WHERE category.is_delete=FALSE AND category.id IS NOT NULL AND usr.id=${id_user} ORDER BY category.id DESC',param,function(categories){
		tools_api.ok200(res,{categories:categories});
	},function(err){
		tools_api.error422(req,res,lang.category.a);
	});
});

router.hook('get','/:id_product',['buyer'],[],function(req,res,role,next){
	var param = req.params;
	param.id_user = req.token_access.id;
	tools_db.one('SELECT product.*,trolley.qty AS trolley_qty FROM table_product product LEFT JOIN (SELECT * FROM table_trolley WHERE id_user=${id_user}) trolley ON trolley.id_product=product.id WHERE product.id=${id_product}',param,function(product){
		tools_api.paginationSupport(req,res,'SELECT product.*,trolley.qty AS trolley_qty FROM table_product_related relation LEFT JOIN table_product product ON product.id=relation.id_related LEFT JOIN (SELECT * FROM table_trolley WHERE id_user=${id_user}) trolley ON trolley.id_product=product.id WHERE relation.id_main='+param.id_product+' AND product.id IS NOT NULL AND product.is_delete=FALSE','product_related',function(related){
			product.related = related;
			tools_api.ok200(res,{product:product});
		},undefined,{waiting:true});
	},function(err){
		tools_api.error422(req,res,lang.product.a);
	});
});

router.hook('post','/:id_product',['seller','employee'],['name','avatar','description','unit','price','id_category','related'],function(req,res,role,next){
	var param = req.body;
	param.packaging = null;
	param.dimension = null;
	param.id_product = req.params.id_product;
	var id_product_old = param.id_product;
	tools_db.one('UPDATE table_product SET is_delete=TRUE WHERE id=${id_product} RETURNING id',param,function(product){
		tools_db.one('INSERT INTO table_product (name,avatar,description,unit,price,id_category,packaging,dimension) VALUES (${name},${avatar},${description},${unit},${price},${id_category},${packaging},${dimension}) RETURNING id',param,function(product){
			tools_db.none('UPDATE table_product_related SET id_related=${id_product_new} WHERE id_related=${id_product_old}',{id_product_old:param.id_product,id_product_new:product.id},function(){},function(err){});
			param.related = JSON.parse(param.related);
			if(param.related.length===0){
				tools_api.success200(res);
				return;
			}
			param.id_product = product.id;
			var insertarray = [];
			param.related.forEach(function(id){
				if(parseInt(id_product_old)!==parseInt(id))insertarray.push("("+param.id_product+","+id+")");
			});
			var insertstring = insertarray.join(',');
			tools_db.none('INSERT INTO table_product_related (id_main,id_related) VALUES '+insertstring,undefined,function(){
				tools_api.success200(res);
			},function(err){
				tools_api.error422(req,res,lang.product.c);
			});
		},function(err){
			tools_api.error422(req,res,lang.product.c);
		});
	},function(err){
		tools_api.error422(req,res,lang.product.c);
	});
	
});

router.hook('post','/',['seller','employee'],['name','avatar','description','unit','price','id_category','related'],function(req,res,role,next){
	var param = req.body;
	param.packaging = null;
	param.dimension = null;
	param.related = JSON.parse(param.related);
	tools_db.one('INSERT INTO table_product (name,avatar,description,unit,price,id_category,packaging,dimension) VALUES (${name},${avatar},${description},${unit},${price},${id_category},${packaging},${dimension}) RETURNING id',param,function(product){
		if(param.related.length===0){
			tools_api.success200(res);
			return;
		}
		param.id_product = product.id;
		var insertarray = [];
		param.related.forEach(function(id){
			insertarray.push("("+param.id_product+","+id+")");
		});
		var insertstring = insertarray.join(',');
		tools_db.none('INSERT INTO table_product_related (id_main,id_related) VALUES '+insertstring,undefined,function(){
			tools_api.success200(res);
		},function(err){
			tools_api.error422(req,res,lang.product.e);
		});
	},function(err){
		tools_api.error422(req,res,lang.product.e);
	});
});

router.hook('get','/:id_product/related',['buyer','seller','employee'],[],function(req,res,role,next){
	var param = req.params;
	console.log('ROLE '+role);
	if(role==='buyer'){
		tools_api.paginationSupport(req,res,'SELECT product.* FROM table_product_related relation LEFT JOIN table_product product ON product.id=relation.id_related WHERE relation.id_main='+param.id_product,'product_related');
	}
	else if(role==='seller' || role==='employee'){
		tools_db.manyOrNone('SELECT id_related AS id FROM table_product_related WHERE id_main=${id_product}',param,function(product_related){
			tools_api.ok200(res,{product_related:product_related});
		},function(err){
			tools_api.error422(req,res,lang.product.b);
		});
	}else tools_api.error422(req,res,lang.product.b);
});


module.exports = router.router;


