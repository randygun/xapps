var tools_routes = require(__dirname+"/../tools/tools_routes");
var tools_api = require(__dirname+"/../tools/tools_api");
var tools_db = require(__dirname+"/../tools/tools_db");
var tools_all = require(__dirname+"/../tools/tools_all");
var tools_email = require(__dirname+"/../tools/tools_email");
var tools_app = require(__dirname+"/../proc/tools_app");
var config = require(__dirname+"/../config");
var lang = require(__dirname+"/../language");
var router = tools_routes.init();
var proc_trolley_confirm = require(__dirname+"/../proc/proc_trolley_confirm");

router.hook('get','/',['buyer'],[],function(req,res,role,next){

	var finish = function(trolley,store){
		tools_api.ok200(res,{trolley:trolley,store:store});
	};

	var param = {id_user:req.token_access.id};
	tools_db.manyOrNone('SELECT product.*,trolley.qty AS trolley_qty FROM table_trolley trolley LEFT JOIN table_product product ON product.id=trolley.id_product WHERE trolley.id_user=${id_user}',param,function(trolley){
		var store = {};
		if(trolley.length===0){
			finish(trolley,undefined);
		}else{
			tools_db.one('SELECT store.*,ST_X(location.geom_location::geometry) AS location_longitude,ST_Y(location.geom_location::geometry) AS location_latitude FROM table_product product LEFT JOIN table_product_category category ON category.id=product.id_category LEFT JOIN table_store store ON store.id=category.id_store LEFT JOIN table_location_gps location ON location.id=store.id_location WHERE product.id=$1',trolley[0].id,function(store){
				console.log(JSON.stringify(trolley));
				console.log(JSON.stringify(store));
				console.log(config.setting.fee_delivery);
				tools_api.ok200(res,{trolley:trolley,store:store,fee_delivery:config.setting.fee_delivery});
			},function(err){
				tools_api.error422(req,res,lang.trolley.e);
			});
		}		
	},function(err){
		tools_api.error422(req,res,lang.trolley.e);
	});
});

router.hook('post','/confirm',['buyer'],['distance','recipient_name','recipient_phone','recipient_remark','destination_remark','id_destination'],function(req,res,role,next){
	//{"trolley_confirm":{"id":"7","id_customer":"49","id_store":"9","recipient_name":"b","recipient_phone":"0","recipient_remark":"c","destination_remark":"a","time_create":"2016-10-13T22:00:23.846Z","generated_number":null,"distance":"14619","fee_delivery":"5000","id_destination":"137"},"store":{"id":"9","time_create":"2016-10-08T04:07:55.003Z","name":"Store Name 9","address":"Store Address 9","phone":"Store Phone 9","is_delete":false,"id_location":"90","id_schedule":"9","location_longitude":106.640824441332,"location_latitude":-6.3713237634997},"products":[{"id":"7","id_category":"90","name":"Semen Holcim","description":"Semen Holcim","time_create":"2016-10-08T04:07:55.029Z","is_delete":false,"avatar":"http://appku.id:3009/images/semen1.png","price":"90","unit":"sak","packaging":"1 sak","dimension":"1m x 1m","qty":"1"},{"id":"13","id_category":"81","name":"Semen Gresik","description":"Semen Gresik","time_create":"2016-10-08T04:07:55.031Z","is_delete":false,"avatar":"http://appku.id:3009/images/semen2.jpg","price":"81","unit":"sak","packaging":"1 sak","dimension":"1m x 1m","qty":"1"}],"destination":{"id":"137","name":"Jalan Bakit Jaya Pocis 7, Setu, Banten, Indonesia, 15315","description":null,"time_create":"2016-10-13T21:56:44.043Z","id_user":"49","geom_location":"0101000020E610000000003855C9AC5A40DBD53528A76919C0"}}
	var param = req.body;
	param.id_user = req.token_access.id;
	tools_db.one('SELECT category.id_store,store.id_schedule,store.is_open FROM table_trolley trolley LEFT JOIN table_product product ON product.id=trolley.id_product LEFT JOIN table_product_category category ON category.id=product.id_category LEFT JOIN table_store store ON store.id=category.id_store WHERE trolley.id_user=${id_user} LIMIT 1 OFFSET 0',param,function(store){
		param.id_store = store.id_store;
		param.id_schedule = store.id_schedule;
		// param.fee_delivery = tools_app.getFeeDelivery(param.distance);
		param.fee_delivery = 0;
		param.distance = parseInt(param.distance);
		var radius = parseInt(config.setting.distance_radius);
		var feeperkm = parseInt(config.setting.fee_perkm);
		if(param.distance>radius){
			// radius = 0; //Ga usah di kurang katanya
			param.fee_delivery = parseInt(Math.ceil((param.distance-0)/1000)*feeperkm);
		}
		console.log("param.distance: "+param.distance+";radius: "+radius+"; feeperkm: "+feeperkm+"; param.fee_delivery: "+param.fee_delivery);
		var query = "SELECT \n\
	d.dt::text AS dt,d.d::text AS d,\n\
	CASE WHEN \n\
		ts.sun=TRUE AND d.d='sun' \n\
	THEN \n\
		CASE WHEN \n\
			d.h<ts.time_open OR to_char(NOW(),'dy')!=d.d\n\
		THEN \n\
			(ts.time_open + INTERVAL '1 hour')::text\n\
		ELSE \n\
			CASE WHEN \n\
				d.h>=ts.time_open AND d.h<ts.time_close \n\
			THEN \n\
				to_char(d.h + INTERVAL '1 hour', 'HH24:MI:SS')\n\
			ELSE null \n\
			END\n\
		END \n\
	ELSE null \n\
	END AS sun,\n\
	CASE WHEN \n\
		ts.mon=TRUE AND d.d='mon' \n\
	THEN \n\
		CASE WHEN \n\
			d.h<ts.time_open OR to_char(NOW(),'dy')!=d.d\n\
		THEN \n\
			(ts.time_open + INTERVAL '1 hour')::text\n\
		ELSE \n\
			CASE WHEN \n\
				d.h>=ts.time_open AND d.h<ts.time_close \n\
			THEN \n\
				to_char(d.h + INTERVAL '1 hour', 'HH24:MI:SS')\n\
			ELSE null \n\
			END\n\
		END \n\
	ELSE null \n\
	END AS mon,";
	query += "CASE WHEN \n\
		ts.tue=TRUE AND d.d='tue' \n\
	THEN \n\
		CASE WHEN \n\
			d.h<ts.time_open OR to_char(NOW(),'dy')!=d.d\n\
		THEN \n\
			(ts.time_open + INTERVAL '1 hour')::text\n\
		ELSE \n\
			CASE WHEN \n\
				d.h>=ts.time_open AND d.h<ts.time_close \n\
			THEN \n\
				to_char(d.h + INTERVAL '1 hour', 'HH24:MI:SS')\n\
			ELSE null \n\
			END\n\
		END \n\
	ELSE null \n\
	END AS tue,\n\
	CASE WHEN \n\
		ts.wed=TRUE AND d.d='wed' \n\
	THEN \n\
		CASE WHEN \n\
			d.h<ts.time_open OR to_char(NOW(),'dy')!=d.d\n\
		THEN \n\
			(ts.time_open + INTERVAL '1 hour')::text\n\
		ELSE \n\
			CASE WHEN \n\
				d.h>=ts.time_open AND d.h<ts.time_close \n\
			THEN \n\
				to_char(d.h + INTERVAL '1 hour', 'HH24:MI:SS')\n\
			ELSE null \n\
			END\n\
		END \n\
	ELSE null \n\
	END AS wed,";
	query += " CASE WHEN ts.thu=TRUE AND d.d='thu' THEN CASE WHEN d.h<ts.time_open OR to_char(NOW(),'dy')!=d.d THEN (ts.time_open + INTERVAL '1 hour')::text ELSE CASE WHEN d.h>=ts.time_open AND d.h<ts.time_close THEN to_char(d.h + INTERVAL '1 hour', 'HH24:MI:SS') ELSE null END END ELSE null END AS thu,";
	query += " CASE WHEN ts.fri=TRUE AND d.d='fri' THEN CASE WHEN d.h<ts.time_open OR to_char(NOW(),'dy')!=d.d THEN (ts.time_open + INTERVAL '1 hour')::text ELSE CASE WHEN d.h>=ts.time_open AND d.h<ts.time_close THEN to_char(d.h + INTERVAL '1 hour', 'HH24:MI:SS') ELSE null END END ELSE null END AS fri,";
	query += "CASE WHEN ts.sat=TRUE AND d.d='sat' THEN CASE WHEN d.h<ts.time_open OR to_char(NOW(),'dy')!=d.d THEN (ts.time_open + INTERVAL '1 hour')::text ELSE CASE WHEN d.h>=ts.time_open AND d.h<ts.time_close THEN to_char(d.h + INTERVAL '1 hour', 'HH24:MI:SS') ELSE null END END ELSE null END AS sat FROM table_schedule ts LEFT JOIN (SELECT -1 AS r, to_char(date_trunc('day', d)::date,'dy') AS d,date_trunc('day', d)::date AS dt, NOW()::time without time zone  AS h FROM generate_series ( NOW(), NOW()+INTERVAL '6 day', '1 day'::interval) d) d ON d.r!=ts.id WHERE ts.id=${id_schedule}";
		tools_db.many(query,param,function(schedules){
			var datetime = null;
			schedules.forEach(function(schedule){
				var day = schedule.d;
				var date = schedule.dt;
				var time = schedule[day];
				if(time!==null && datetime === null){
					datetime = date+" "+time;
				}
			});
			if(datetime===null) {
				tools_api.error422(req,res,lang.generic.b);
				return;			
			}
			param.time_expire = datetime;
			if(!store.is_open) param.time_expire = null;
			tools_db.one('INSERT INTO table_trolley_confirm (id_customer,id_store,recipient_name,recipient_phone,recipient_remark,destination_remark,distance,fee_delivery,id_destination,time_expire) SELECT ${id_user},${id_store},${recipient_name},${recipient_phone},${recipient_remark},${destination_remark},${distance},${fee_delivery},${id_destination},${time_expire} RETURNING id,time_create,generated_number',param,function(trolley_confirm){
				param.id_trolley_confirm = trolley_confirm.id;
				param.role_seller = config.dynamic.role.seller;
				tools_db.one('SELECT username,name FROM table_user WHERE id_store=${id_store} AND id_role=${role_seller}',param,function(seller){
					tools_email.logSend(req.app,[seller.username],'Order Request','template_email_order_new_seller','order_new_seller',{
						attachments:[
				          {
				            fileName:'tunjukmaterial.png',
				            filePath: __dirname+"/../public/images/tm_green.png",
				            cid: 'tmpicture'
				          }
				        ],
				        name: seller.name,
				        support:{
				          phone: config.setting.support_phone,
				          email: config.setting.support_email,
				          operationaltime: config.setting.support_operationaltime
				        }
					});
				},function(err){});
				tools_db.one('SELECT username,name FROM table_user WHERE id=${id_user}',param,function(buyer){
					tools_email.logSend(req.app,[buyer.username],'Pesanan Barang','template_email_order_new_buyer','order_new_buyer',{
						attachments:[
				          {
				            fileName:'tunjukmaterial.png',
				            filePath: __dirname+"/../public/images/tm_red.png",
				            cid: 'tmpicture'
				          }
				        ],
				        name: buyer.name,
				        support:{
				          phone: config.setting.support_phone,
				          email: config.setting.support_email,
				          operationaltime: config.setting.support_operationaltime
				        }
					});
				},function(err){});
				tools_db.many('INSERT INTO table_trolley_confirm_detail (id_product,id_trolley_confirm,qty) SELECT trolley.id_product,${id_trolley_confirm},trolley.qty FROM table_trolley trolley LEFT JOIN table_product product ON product.id=trolley.id_product LEFT JOIN table_product_category category ON category.id=product.id_category WHERE trolley.id_user=${id_user} AND category.id_store=${id_store} RETURNING id',param,function(trolley_confirm_detail){
					//SISIPIN MASUKIN NOTIFICATION
					param.id_role = config.dynamic.role.seller;
					tools_db.one('SELECT dev.token_fcm FROM table_user usr LEFT JOIN table_device dev ON dev.id=usr.id_device WHERE usr.id_store=${id_store} AND usr.id_role=${id_role}',param,function(user){
						param.token_fcm = user.token_fcm;
						if(param.token_fcm === null) param.token_fcm = "";
						var title = "New Order";
						var message = "New user order "+trolley_confirm_detail.length+" products from your store";
						var job = "trolley_created";
						var sent = {title:title,message:message,job:job,id:param.id_trolley_confirm};
						if(config.dynamic.language[req.token_access.lang] === 'id'){
							//INDONESIA
							sent.title = "Order Baru";
							sent.message = "Pelanggan baru order "+trolley_confirm_detail.length+" barang dari toko anda";
						}
						param.sent = JSON.stringify(sent);
						tools_db.none('INSERT INTO table_notification (id_user,device_token,sent) VALUES (${id_user},${token_fcm},${sent})',param,function(){},function(err){});
					},function(err){

					});
					//BUKAN NOTIFICATION
					tools_db.many('DELETE FROM table_trolley WHERE id_user=${id_user} RETURNING id',param,function(table_trolley){
						proc_trolley_confirm.query(req,res,param);
					},function(err){
						tools_api.error422(req,res,lang.trolleyconfirm.c);
					});
				},function(err){
					tools_api.error422(req,res,lang.trolleyconfirm.b);
				});
			},function(err){
				tools_api.error422(req,res,lang.trolleyconfirm.b);
			});
		},function(err){
			tools_api.error422(req,res,lang.generic.b);
		});		
	},function(err){
		tools_api.error422(req,res,lang.trolleyconfirm.a);
	});
});

router.hook('put','/:id_product',['buyer'],[],function(req,res,role,next){
	//AddProduct to trolley
	//Trolley harus kosong atau tidak ada produk lain selain toko itu
	var param = req.params;
	param.id_user = req.token_access.id;
	var okay = function(trolley){
		tools_api.ok200(res,{trolley:trolley});
		return;
		// tools_db.one('SELECT store.* FROM table_product product LEFT JOIN table_product_category category ON category.id=product.id_category WHERE product.id=${id_product}',param,function(store){
		// 	tools_api.ok200(res,{trolley:trolley,store:store});
		// },function(err){
		// 	tools_api.error422(req,res,lang.trolley.b);
		// });
	};
	tools_db.many('\n\
		SELECT \n\
		trolley.id \n\
		FROM table_trolley trolley\n\
		LEFT JOIN table_product product ON product.id=trolley.id_product\n\
		LEFT JOIN table_product_category category ON category.id=product.id_category\n\
		LEFT JOIN (SELECT category.id_store FROM table_product product LEFT JOIN table_product_category category ON category.id=product.id_category WHERE product.id=${id_product}) wtadd ON wtadd.id_store!=category.id_store\n\
		WHERE trolley.id_user=${id_user} AND wtadd.id_store IS NOT NULL',param,function(trolley){
			//Ga Boleh ditambah
			tools_api.error422(req,res,lang.trolley.a);
		},function(err){
			//Boleh ditambah
			tools_db.one('UPDATE table_trolley SET qty=qty+1 WHERE id_product=${id_product} AND id_user=${id_user} RETURNING *',param,function(trolley){
				okay(trolley);
			},function(err){
				tools_db.one('INSERT INTO table_trolley (id_product,id_user,qty) VALUES (${id_product},${id_user},1) RETURNING *',param,function(trolley){
					okay(trolley);
				},function(err){
					tools_api.error422(req,res,lang.trolley.b);
				});
			});
		});
});

router.hook('delete','/:id_product',['buyer'],[],function(req,res,role,next){
	//Delete product from trolley
	var param = req.params;
	param.id_user = req.token_access.id;
	tools_db.one('UPDATE table_trolley SET qty=qty-1 WHERE id_product=${id_product} AND id_user=${id_user} AND qty>0 RETURNING *',param,function(trolley){
		if(parseInt(trolley.qty)===0){
			param.id_trolley = trolley.id;
			tools_db.none('DELETE FROM table_trolley WHERE id=${id_trolley}',param,function(){},function(err){});
		}
		tools_api.ok200(res,{trolley:trolley});
	},function(err){
		tools_api.error422(req,res,lang.trolley.c);
	});
});

router.hook("delete","/",['buyer'],[],function(req,res,role,next){
	//Clear Trolley
	var param = {id_user:req.token_access.id};
	tools_db.many('DELETE FROM table_trolley WHERE id_user=${id_user} RETURNING id',param,function(data){
		tools_api.success200(res);
	},function(err){
		tools_api.error422(req,res,lang.trolley.d);
	});
});

router.hook('patch','/:id_product',['buyer'],['qty'],function(req,res,role,next){
	var param = req.params;
	param.id_user = req.token_access.id;
	param.qty = req.query.qty;
	var okay = function(trolley){
		if(trolley.qty<=0){
			param.id_trolley = trolley.id;
			tools_db.none('DELETE FROM table_trolley WHERE id=${id_trolley}',param,function(){},function(err){});
		}
		tools_api.ok200(res,{trolley:trolley});
		return;
	};
	tools_db.many('\n\
		SELECT \n\
		trolley.id \n\
		FROM table_trolley trolley\n\
		LEFT JOIN table_product product ON product.id=trolley.id_product\n\
		LEFT JOIN table_product_category category ON category.id=product.id_category\n\
		LEFT JOIN (SELECT category.id_store FROM table_product product LEFT JOIN table_product_category category ON category.id=product.id_category WHERE product.id=${id_product}) wtadd ON wtadd.id_store!=category.id_store\n\
		WHERE trolley.id_user=${id_user} AND wtadd.id_store IS NOT NULL',param,function(trolley){
			//Ga Boleh ditambah
			tools_api.error422(req,res,lang.trolley.a);
		},function(err){
			//Boleh ditambah dikurang
			tools_db.one('UPDATE table_trolley SET qty=${qty} WHERE id_product=${id_product} AND id_user=${id_user} RETURNING *',param,function(trolley){
				okay(trolley);
			},function(err){
				tools_db.one('INSERT INTO table_trolley (id_product,id_user,qty) VALUES (${id_product},${id_user},${qty}) RETURNING *',param,function(trolley){
					okay(trolley);
				},function(err){
					tools_api.error422(req,res,lang.trolley.b);
				});
			});		
		});
});

module.exports = router.router;