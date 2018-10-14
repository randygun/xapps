var tools_routes = require(__dirname+"/../tools/tools_routes");
var tools_api = require(__dirname+"/../tools/tools_api");
var tools_db = require(__dirname+"/../tools/tools_db");
var tools_all = require(__dirname+"/../tools/tools_all");
var tools_email = require(__dirname+"/../tools/tools_email");
var config = require(__dirname+"/../config");
var lang = require(__dirname+"/../language");
var router = tools_routes.init();
var proc_printing = require(__dirname+"/../proc/proc_printing");

router.hook('post','/charge/:id_order',['buyer'],['pin','id_type'],function(req,res,role,next){
	var param = req.body;
	param.id_order = req.params.id_order;
	param.id_user = req.token_access.id;
	tools_db.one('SELECT saldo,pin AS pin_db,md5(${pin}) AS pin_input FROM table_user WHERE id=${id_user}',param,function(user){
		if(user.pin_input!==user.pin_db){
			tools_api.error422(req,res,lang.auth.a);
			return;
		}
		tools_db.one('\n\
			SELECT \n\
			SUM(tp.price*tcad.qty)+AVG(tc.fee_delivery)::integer AS summed,\n\
			tc.generated_number \n\
			FROM table_trolley_confirm tc \n\
			LEFT JOIN table_trolley_confirm_agree agr ON agr.id_confirm=tc.id\n\
			LEFT JOIN table_trolley_paid pd ON pd.id_agree=agr.id\n\
			LEFT JOIN table_trolley_confirm_detail tcd ON tcd.id_trolley_confirm=tc.id \n\
			LEFT JOIN table_trolley_confirm_agree_detail tcad ON tcad.id_confirm_detail=tcd.id \n\
			LEFT JOIN table_product tp ON tp.id=tcd.id_product \n\
			WHERE tcad.id IS NOT NULL AND tp.id IS NOT NULL AND tc.id=${id_order} AND pd.id IS NULL \n\
			GROUP BY tc.generated_number',param,function(order){
			if(parseInt(param.id_type)===1){
				//DEPOSIT
				if(parseInt(order.summed)>parseInt(user.saldo)){
					//GA CUKUP
					tools_api.ok200(res,{
						saldo:user.saldo,
						is_granted:false,
						is_topup:true
					});
				}else{
					//CUKUP
					param.price = order.summed;
					tools_db.one('UPDATE table_user SET saldo=saldo-${price} WHERE id=${id_user} AND saldo>=${price} RETURNING id,saldo',param,function(buyer){
						
						var amount = parseInt(param.price);
						var balance_current = parseInt(buyer.saldo)+parseInt(param.price);
						var balance_after = parseInt(buyer.saldo);
						var parambalancehistory = {
							remark_id:'Pembayaran',
							remark_en:'Payment',
							remark_zh:'Payment',
							id_user:buyer.id,
							is_plus:false,
							amount:amount,
							balance_current:balance_current,
							balance_after:balance_after,
							order:order.generated_number
						};
						tools_db.none('INSERT INTO table_balance_history (remark_id,remark_en,remark_zh,id_user,is_plus,amount,balance_current,balance_after,order_number) VALUES (${remark_id},${remark_en},${remark_zh},${id_user},${is_plus},${amount},${balance_current},${balance_after},${order})',parambalancehistory,function(){},function(err){});
						
						tools_db.one('UPDATE table_trolley_confirm_agree SET is_paid=TRUE WHERE id_confirm=${id_order} RETURNING id',param,function(agree){
							proc_printing.pdfSO(param.id_order,'LUNAS',function(){
								param.role_seller = config.dynamic.role.seller;
								tools_db.one('SELECT usr.username,usr.name FROM table_trolley_confirm tc LEFT JOIN (SELECT * FROM table_user WHERE id_role=${role_seller}) usr ON usr.id_store=tc.id_store WHERE tc.id=${id_order}',param,function(seller){
									tools_email.logSend(req.app,[seller.username],'Pesanan Lunas','template_email_order_paid_seller','order_paid_seller',{
										attachments:[
							          {
							            fileName:'tunjukmaterial.png',
							            filePath: __dirname+"/../public/images/tm_green.png",
							            cid: 'tmpicture'
							          },
							          {
							            fileName:'SalesOrder.pdf',
							            filePath: __dirname+"/../public/salesorder/SalesOrder"+param.id_order+".pdf"
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
								tools_db.one('SELECT usr.username,usr.name FROM table_trolley_confirm tc LEFT JOIN table_user usr ON usr.id=tc.id_customer WHERE tc.id=${id_order}',param,function(buyer){
									tools_email.logSend(req.app,[buyer.username],'Pesanan Lunas','template_email_order_paid_buyer','order_paid_buyer',{
										attachments:[
							          {
							            fileName:'tunjukmaterial.png',
							            filePath: __dirname+"/../public/images/tm_red.png",
							            cid: 'tmpicture'
							          },
							          {
							            fileName:'SalesOrder.pdf',
							            filePath: __dirname+"/../public/salesorder/SalesOrder"+param.id_order+".pdf"
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
							});							
							param.id_agree = agree.id;
							param.commission = config.setting.commission;
							tools_db.one('INSERT INTO table_trolley_paid (id_agree,id_provider,commission) VALUES (${id_agree},${id_type},${commission}) RETURNING id',param,function(paid){
								//NOTIFICATION
								tools_db.one('SELECT id_store FROM table_trolley_confirm WHERE id=${id_order}',param,function(confirm){
									param.id_store = confirm.id_store;
									tools_db.one('SELECT dev.token_fcm,usr.id_language,usr.id FROM table_user usr LEFT JOIN table_device dev ON dev.id=usr.id_device WHERE usr.id_store=${id_store} AND usr.id_role='+config.dynamic.role.seller,param,function(user){
										param.token_fcm = user.token_fcm;
										param.id_seller = user.id;
										if(param.token_fcm === null) param.token_fcm = "";
										var title = "Order Paid";
										var message = "Order paid by user. Please prepare the delivery.";
										var job = "trolley_paid";
										var sent = {title:title,message:message,job:job,id:param.id_order};
										if(config.dynamic.language[user.id_language] === 'id'){
											//INDONESIA
											sent.title = "Pesanan Lunas";
											sent.message = "Order telah dibayar. Siapkan untuk pengiriman.";
										}
										param.sent = JSON.stringify(sent);
										tools_db.none('INSERT INTO table_notification (id_user,device_token,sent) VALUES (${id_seller},${token_fcm},${sent})',param,function(){},function(err){});
									},function(err){

									});
								},function(err){

								});
								tools_api.ok200(res,{
									generated_number:order.generated_number,
									amount:parseInt(order.summed),
									saldo:buyer.saldo,
									is_granted:true,
									is_topup:false
								});
		
								// tools_api.success200(res);
							},function(err){
								tools_api.error422(req,res,lang.order.c);
							});
						},function(err){
							tools_api.error422(req,res,lang.order.c);
						});
					},function(err){
						tools_api.error422(req,res,lang.order.d);
					});
				}
			}else if(parseInt(param.id_type)===2||parseInt(param.id_type)===3||parseInt(param.id_type)===4){
				//VT
				//GENERATE VT NUMBER
				var generateOrder = function(){
					tools_db.one('INSERT INTO table_order (generated_number,id_order,id_user) SELECT generated_number,${id_order},${id_user} FROM table_trolley_confirm WHERE id=${id_order} RETURNING generated_number',param,function(ordervt){
						tools_api.ok200(res,{
							generated_number:ordervt.generated_number,
							amount:parseInt(order.summed),
							saldo:user.saldo,
							is_granted:true,
							is_topup:false
						});
					},function(err){
						tools_api.error422(req,res,lang.order.d);
					});
				};
				if(parseInt(param.id_type)===4){
					//Installment, check minimum transaction
					if(parseInt(order.summed)<500000) tools_api.error422(req,res,lang.order.f);
					else generateOrder();
				}else generateOrder();
			}else{
				tools_api.error422(req,res,lang.order.d);
			}
		},function(err){
			tools_api.error422(req,res,lang.order.d);
		});
	},function(err){
		tools_api.error422(req,res,lang.order.d);
	});
});

router.hook('delete','/pay/:id_order',['buyer'],['remark'],function(req,res,role,next){
	var param = req.params;
	param.id_user = req.token_access.id;
	param.remark = req.query.remark;
	tools_db.one('UPDATE table_trolley_confirm SET time_close=NOW(),is_delete=TRUE, is_read_buyer=FALSE,is_read_seller=FALSE,reject_who=\'Buyer\',reject_reason=${remark} WHERE id=${id_order} RETURNING id,id_customer,id_store',param,function(order){
		param.id_store = order.id_store;
		//NOTIFICATION
		param.id_customer = order.id_customer;
		tools_db.one('SELECT dev.token_fcm,usr.id_language,usr.id FROM table_user usr LEFT JOIN table_device dev ON dev.id=usr.id_device WHERE usr.id_store=${id_store} AND usr.id_role='+config.dynamic.role.seller,param,function(user){
			param.token_fcm = user.token_fcm;
			param.id_seller = user.id;
			if(param.token_fcm === null) param.token_fcm = "";
			var title = "Order Rejected";
			var message = "Order rejected by user. Apologize for the inconvenience.";
			var job = "trolley_rejected";
			var sent = {title:title,message:message,job:job,id:param.id_order};
			if(config.dynamic.language[user.id_language] === 'id'){
				//INDONESIA
				sent.title = "Order Ditolak";
				sent.message = "Order ditolak oleh pembeli. Mohon maaf atas ketidaknyamanannya.";
			}
			param.sent = JSON.stringify(sent);
			tools_db.none('INSERT INTO table_notification (id_user,device_token,sent) VALUES (${id_seller},${token_fcm},${sent})',param,function(){},function(err){});
		},function(err){

		});
		//NOTIFICATION END
		tools_api.success200(res);
	},function(err){
		tools_api.error422(req,res,lang.order.b);
	});
});

router.hook('post','/pay/:id_order',['buyer'],['pin','id_type'],function(req,res,role,next){
	tools_api.error422(req,res,lang.generic.b);
	return;
	var param = req.body;
	param.id_order = req.params.id_order;
	param.id_user = req.token_access.id;
	tools_db.one('SELECT pin,MD5(${pin}) AS md5pin FROM table_user WHERE id=${id_user}',param,function(user){
		if(user.pin === user.md5pin){
			//SAMA
			tools_db.one('UPDATE table_trolley_confirm_agree SET is_paid=TRUE WHERE id_confirm=${id_order} RETURNING id',param,function(agree){
				param.id_agree = agree.id;
				param.commission = config.setting.commission;
				tools_db.one('INSERT INTO table_trolley_paid (id_agree,id_provider,commission) VALUES (${id_agree},${id_type},${commission}) RETURNING id',param,function(paid){
					//NOTIFICATION
					tools_db.one('SELECT id_store FROM table_trolley_confirm WHERE id=${id_order}',param,function(confirm){
						param.id_store = confirm.id_store;
						tools_db.one('SELECT dev.token_fcm,usr.id_language,usr.id FROM table_user usr LEFT JOIN table_device dev ON dev.id=usr.id_device WHERE usr.id_store=${id_store} AND usr.id_role='+config.dynamic.role.seller,param,function(user){
							param.token_fcm = user.token_fcm;
							param.id_seller = user.id;
							if(param.token_fcm === null) param.token_fcm = "";
							var title = "Order Paid";
							var message = "Order paid by user. Please prepare the delivery.";
							var job = "trolley_paid";
							var sent = {title:title,message:message,job:job,id:param.id_order};
							if(config.dynamic.language[user.id_language] === 'id'){
								//INDONESIA
								sent.title = "Pesanan Lunas";
								sent.message = "Order telah dibayar. Siapkan untuk pengiriman.";
							}
							param.sent = JSON.stringify(sent);
							tools_db.none('INSERT INTO table_notification (id_user,device_token,sent) VALUES (${id_seller},${token_fcm},${sent})',param,function(){},function(err){});
						},function(err){

						});
					},function(err){

					});					
					tools_api.success200(res);
				},function(err){
					tools_api.error422(req,res,lang.order.c);
				});
			},function(err){
				tools_api.error422(req,res,lang.order.c);
			});
		}else{
			//GA SAMA
			tools_api.error422(req,res,lang.auth.a);
		}
	},function(err){
		tools_api.error422(req,res,lang.order.c);
	});
});

router.hook('get','/done/:id_order',['buyer','seller'],[],function(req,res,role,next){
	var param = req.params;
	param.id_user = req.token_access.id;
	tools_db.one('\n\
		SELECT tc.*,ts.address AS address_store,COALESCE(tg.name,\'-\') || \', \' || COALESCE(tc.destination_remark,\'-\') AS address_destination, \n\
		tca.time_create AS time_confirmed,tca.time_deliver_plan,tca.remark,tp.time_create AS time_paid,tp.rating,tp.remark AS remark_review, ts.name AS store_name, ts.phone AS store_phone,usr.name AS customer_name,usr.phone AS customer_phone\n\
		FROM table_trolley_confirm tc \n\
		LEFT JOIN table_user usr ON usr.id=tc.id_customer\n\
		LEFT JOIN table_trolley_confirm_agree tca ON tca.id_confirm=tc.id\n\
		LEFT JOIN table_trolley_paid tp ON tp.id_agree=tca.id\n\
		LEFT JOIN table_store ts ON ts.id=tc.id_store\n\
		LEFT JOIN table_location_gps tg ON tg.id=tc.id_destination\n\
		WHERE tc.id=${id_order}',param,function(order_done){
		param.id_trolley_confirm = order_done.id;
		tools_db.many('\n\
			SELECT \n\
			prod.id,prod.name,prod.price,prod.unit,\n\
			tcd.qty AS trolley_qty,tcad.qty AS trolley_qty_confirmed,tcd.id AS id_order_detail \n\
			FROM table_trolley_confirm_detail tcd\n\
			LEFT JOIN table_trolley_confirm_agree_detail tcad ON tcad.id_confirm_detail=tcd.id\n\
			LEFT JOIN table_product prod ON prod.id=tcd.id_product\n\
			WHERE id_trolley_confirm=${id_trolley_confirm}\n\
			',param,function(products){
				proc_printing.pdfSO(order_done.id,'LUNAS',function(){
					order_done.products = products;
					tools_api.ok200(res,{order_done:order_done});
				});
			},function(err){
				tools_api.error422(req,res,lang.order.a);
			});		
	},function(err){
		tools_api.error422(req,res,lang.order.a);
	});
});

router.hook('get','/notpaid',['seller'],[],function(req,res,role,next){
});

router.hook('get','/paid',['seller'],[],function(req,res,role,next){
});

router.hook('get','/paid/:id_order',['buyer'],[],function(req,res,role,next){
	var param = req.params;
	param.id_user = req.token_access.id;
	tools_db.one('\n\
		SELECT tc.*,ts.address AS address_store,COALESCE(tg.name,\'-\') || \', \' || COALESCE(tc.destination_remark,\'-\') AS address_destination, \n\
		tca.time_create AS time_confirmed,tca.time_deliver_plan,tca.remark,tp.time_create AS time_paid,tp.is_sent,usr.name AS customer_name, usr.phone AS customer_phone, ts.name AS store_name,ts.phone AS store_phone\n\
		FROM table_trolley_confirm tc \n\
		LEFT JOIN table_user usr ON usr.id=tc.id_customer\n\
		LEFT JOIN table_trolley_confirm_agree tca ON tca.id_confirm=tc.id\n\
		LEFT JOIN table_trolley_paid tp ON tp.id_agree=tca.id\n\
		LEFT JOIN table_store ts ON ts.id=tc.id_store\n\
		LEFT JOIN table_location_gps tg ON tg.id=tc.id_destination\n\
		WHERE tc.id=${id_order}',param,function(order_paid){
		param.id_trolley_confirm = order_paid.id;
		tools_db.many('\n\
			SELECT \n\
			prod.id,prod.name,prod.price,prod.unit,\n\
			tcd.qty AS trolley_qty,tcad.qty AS trolley_qty_confirmed,tcd.id AS id_order_detail \n\
			FROM table_trolley_confirm_detail tcd\n\
			LEFT JOIN table_trolley_confirm_agree_detail tcad ON tcad.id_confirm_detail=tcd.id\n\
			LEFT JOIN table_product prod ON prod.id=tcd.id_product\n\
			WHERE id_trolley_confirm=${id_trolley_confirm}\n\
			',param,function(products){
				order_paid.products = products;
				tools_api.ok200(res,{order_paid:order_paid});
			},function(err){
				tools_api.error422(req,res,lang.order.a);
			});		
	},function(err){
		tools_api.error422(req,res,lang.order.a);
	});
});

router.hook('get','/pending/:id_order',['seller'],[],function(req,res,role,next){
	var param = req.params;
	param.id_user = req.token_access.id;
	tools_db.one('\n\
		SELECT tc.*,ts.address AS address_store,COALESCE(tg.name,\'-\') || \', \' || COALESCE(tc.destination_remark,\'-\') AS address_destination, \n\
		tca.time_create AS time_confirmed,tca.time_deliver_plan,tca.remark,tca.is_read_seller AS is_read_seller,usr.name AS customer_name,usr.phone AS customer_phone,store.name AS store_name,store.phone AS store_phone\n\
		FROM table_trolley_confirm tc \n\
		LEFT JOIN table_store store ON store.id=tc.id_store \n\
		LEFT JOIN table_trolley_confirm_agree tca ON tca.id_confirm=tc.id\n\
		LEFT JOIN table_user usr ON usr.id=tc.id_customer\n\
		LEFT JOIN table_trolley_paid tp ON tp.id_agree=tca.id\n\
		LEFT JOIN table_store ts ON ts.id=tc.id_store\n\
		LEFT JOIN table_location_gps tg ON tg.id=tc.id_destination\n\
		WHERE tc.id=${id_order}',param,function(order_pending){
		param.id_trolley_confirm = order_pending.id;
		tools_db.many('\n\
			SELECT \n\
			prod.id,prod.name,prod.price,prod.unit,\n\
			tcd.qty AS trolley_qty,tcad.qty AS trolley_qty_confirmed,tcd.id AS id_order_detail \n\
			FROM table_trolley_confirm_detail tcd\n\
			LEFT JOIN table_trolley_confirm_agree_detail tcad ON tcad.id_confirm_detail=tcd.id\n\
			LEFT JOIN table_product prod ON prod.id=tcd.id_product\n\
			WHERE id_trolley_confirm=${id_trolley_confirm}\n\
			',param,function(products){
				order_pending.products = products;
				tools_api.ok200(res,{order_pending:order_pending});
			},function(err){
				tools_api.error422(req,res,lang.order.a);
			});		
	},function(err){
		tools_api.error422(req,res,lang.order.a);
	});
});

router.hook('get','/delivered/:id_order',['seller'],[],function(req,res,role,next){
	var param = req.params;
	param.id_user = req.token_access.id;
	tools_db.one('\n\
		SELECT tc.*,ts.address AS address_store,COALESCE(tg.name,\'-\') || \', \' || COALESCE(tc.destination_remark,\'-\') AS address_destination, \n\
		tca.time_create AS time_confirmed,tca.time_deliver_plan,tca.remark,ts.name AS store_name,ts.phone AS store_phone,usr.name AS customer_name, usr.phone AS customer_phone\n\
		FROM table_trolley_confirm tc \n\
		LEFT JOIN table_user usr ON usr.id=tc.id_customer\n\
		LEFT JOIN table_trolley_confirm_agree tca ON tca.id_confirm=tc.id\n\
		LEFT JOIN table_trolley_paid tp ON tp.id_agree=tca.id\n\
		LEFT JOIN table_store ts ON ts.id=tc.id_store\n\
		LEFT JOIN table_location_gps tg ON tg.id=tc.id_destination\n\
		WHERE tc.id=${id_order}',param,function(order_delivered){
		param.id_trolley_confirm = order_delivered.id;
		tools_db.many('\n\
			SELECT \n\
			prod.id,prod.name,prod.price,prod.unit,\n\
			tcd.qty AS trolley_qty,tcad.qty AS trolley_qty_confirmed,tcd.id AS id_order_detail \n\
			FROM table_trolley_confirm_detail tcd\n\
			LEFT JOIN table_trolley_confirm_agree_detail tcad ON tcad.id_confirm_detail=tcd.id\n\
			LEFT JOIN table_product prod ON prod.id=tcd.id_product\n\
			WHERE id_trolley_confirm=${id_trolley_confirm}\n\
			',param,function(products){
				order_delivered.products = products;
				tools_api.ok200(res,{order_delivered:order_delivered});
			},function(err){
				tools_api.error422(req,res,lang.order.a);
			});		
	},function(err){
		tools_api.error422(req,res,lang.order.a);
	});
});

router.hook('get','/pay/:id_order',['buyer'],[],function(req,res,role,next){
	var param = req.params;
	param.id_user = req.token_access.id;
	tools_db.one('\n\
		SELECT tc.*,ts.address AS address_store,COALESCE(tg.name,\'-\') || \', \' || COALESCE(tc.destination_remark,\'-\') AS address_destination, \n\
		tca.time_create AS time_confirmed,tca.time_deliver_plan,tca.remark,ts.name AS store_name,ts.phone AS store_phone,usr.name AS customer_name,usr.phone AS customer_phone\n\
		FROM table_trolley_confirm tc \n\
		LEFT JOIN table_user usr ON usr.id=tc.id_customer \n\
		LEFT JOIN table_trolley_confirm_agree tca ON tca.id_confirm=tc.id\n\
		LEFT JOIN table_store ts ON ts.id=tc.id_store\n\
		LEFT JOIN table_location_gps tg ON tg.id=tc.id_destination\n\
		WHERE tc.id=${id_order}',param,function(order_confirmed){
		param.id_trolley_confirm = order_confirmed.id;
		tools_db.many('\n\
			SELECT \n\
			prod.id,prod.name,prod.price,prod.unit,\n\
			tcd.qty AS trolley_qty,tcad.qty AS trolley_qty_confirmed,tcd.id AS id_order_detail \n\
			FROM table_trolley_confirm_detail tcd\n\
			LEFT JOIN table_trolley_confirm_agree_detail tcad ON tcad.id_confirm_detail=tcd.id\n\
			LEFT JOIN table_product prod ON prod.id=tcd.id_product\n\
			WHERE id_trolley_confirm=${id_trolley_confirm}\n\
			',param,function(products){
				order_confirmed.products = products;
				tools_api.ok200(res,{order_confirmed:order_confirmed});
			},function(err){
				tools_api.error422(req,res,lang.order.a);
			});		
	},function(err){
		tools_api.error422(req,res,lang.order.a);
	});
});

router.hook('post','/new/:id_order',['seller'],['date','time','remark','pin','map'],function(req,res,role,next){
	var param = req.body;
	param.id_order = req.params.id_order;
	param.id_user = req.token_access.id;
	param.deliver = param.date+" "+param.time;
	console.log("MAP"+param.map);
	var map = JSON.parse(param.map);
	tools_db.one('SELECT pin,MD5(${pin}) AS md5pin, CASE WHEN ${deliver}>NOW() THEN true ELSE false END AS time_valid FROM table_user WHERE id=${id_user}',param,function(user){
		if(!user.time_valid){
			tools_api.error422(req,res,lang.order.e);
			return;
		}
		if(user.pin===user.md5pin){
			//SAMA
			tools_db.none('UPDATE table_trolley_confirm SET is_read_buyer=FALSE WHERE id=${id_order}',param,function(data){},function(err){});
			param.role_seller = config.dynamic.role.seller;
			tools_db.many('SELECT * FROM table_trolley_confirm_detail WHERE id_trolley_confirm=${id_order}',param,function(details){
				var insertArray = [];
				details.forEach(function(item){
					insertArray.push('('+item.id+','+map[item.id]+')');
				});
				var insertString = insertArray.join(',');
				tools_db.one('INSERT INTO table_trolley_confirm_agree (id_confirm,time_deliver_plan,remark) VALUES (${id_order},${deliver},${remark}) RETURNING id',param,function(agreed){
					tools_db.none('INSERT INTO table_trolley_confirm_agree_detail (id_confirm_detail,qty) VALUES '+insertString,undefined,function(){
						tools_db.one('UPDATE table_trolley_confirm SET is_agreed=TRUE WHERE id=${id_order} RETURNING id,id_customer',param,function(data){
							//NOTIFICATION
							param.id_customer = data.id_customer;
							tools_db.one('SELECT dev.token_fcm,usr.id_language FROM table_user usr LEFT JOIN table_device dev ON dev.id=usr.id_device WHERE usr.id=${id_customer}',param,function(user){
								param.token_fcm = user.token_fcm;
								if(param.token_fcm === null) param.token_fcm = "";
								var title = "Order Confirmed";
								var message = "Order confirmed by seller. Please proceed to next step.";
								var job = "trolley_confirmed";
								var sent = {title:title,message:message,job:job,id:param.id_order};
								if(config.dynamic.language[user.id_language] === 'id'){
									//INDONESIA
									sent.title = "Order Dikonfirmasi";
									sent.message = "Order terkonfirmasi oleh penjual. Silahkan di proses ke tahap berikutnya.";
								}
								param.sent = JSON.stringify(sent);
								tools_db.none('INSERT INTO table_notification (id_user,device_token,sent) VALUES (${id_customer},${token_fcm},${sent})',param,function(){},function(err){});
							},function(err){

							});
							//NOT A NOTIFICATION
							proc_printing.pdfSO(param.id_order,undefined,function(){
								tools_api.success200(res);
								tools_db.one('SELECT usr.username,usr.name FROM table_trolley_confirm tc LEFT JOIN (SELECT * FROM table_user WHERE id_role=${role_seller}) usr ON usr.id_store=tc.id_store WHERE tc.id=${id_order}',param,function(seller){
									tools_email.logSend(req.app,[seller.username],'Pesanan Dikonfirmasi','template_email_order_agree_seller','order_agree_seller',{
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
								tools_db.one('SELECT usr.username,usr.name FROM table_trolley_confirm tc LEFT JOIN table_user usr ON usr.id=tc.id_customer WHERE tc.id=${id_order}',param,function(buyer){
									tools_email.logSend(req.app,[buyer.username],'Pesanan Dikonfirmasi','template_email_order_agree_buyer','order_agree_buyer',{
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
							});							
						},function(err){
							tools_api.error422(req,res,lang.order.c);
						});						
					},function(err){
						tools_api.error422(req,res,lang.order.c);
					});
				},function(err){
					tools_api.error422(req,res,lang.order.c);
				});
			},function(err){
				tools_api.error422(req,res,lang.order.a);
			});
		}else{
			//BEDA
			tools_api.error422(req,res,lang.auth.a);
		}
	},function(err){
		tools_api.error422(req,res,lang.order.a);
	});
});

router.hook('delete','/new/:id_order',['seller'],['remark'],function(req,res,role,next){
	var param = req.params;
	param.remark = req.query.remark;
	tools_db.one('UPDATE table_trolley_confirm SET time_close=NOW(),is_delete=TRUE, is_read_buyer=FALSE,is_read_seller=FALSE,reject_who=\'Seller\', reject_reason=${remark} WHERE id=${id_order} RETURNING id,id_customer',param,function(order){
		//NOTIFICATION
		param.id_customer = order.id_customer;
			tools_db.one('SELECT dev.token_fcm,usr.id_language FROM table_user usr LEFT JOIN table_device dev ON dev.id=usr.id_device WHERE usr.id=${id_customer}',param,function(user){
				param.token_fcm = user.token_fcm;
				if(param.token_fcm === null) param.token_fcm = "";
				var title = "Order Rejected";
				var message = "Order rejected by seller. Apologize for the inconvenience. You can order same / different product to another seller.";
				var job = "trolley_rejected";
				var sent = {title:title,message:message,job:job,id:param.id_order};
				if(config.dynamic.language[user.id_language] === 'id'){
					//INDONESIA
					sent.title = "Order Ditolak";
					sent.message = "Order ditolak oleh penjual. Mohon maaf atas ketidaknyamanannya. Anda dapat order produk yang sama ke seller lain pilihan Anda.";
				}
				param.sent = JSON.stringify(sent);
				tools_db.none('INSERT INTO table_notification (id_user,device_token,sent) VALUES (${id_customer},${token_fcm},${sent})',param,function(){},function(err){});
			},function(err){

			});
		//NOTIFICATION END
		tools_api.success200(res);
	},function(err){
		tools_api.error422(req,res,lang.order.b);
	});
});

router.hook('get','/new/:id_order',['seller'],[],function(req,res,role,next){
	//Detail of order
	var param = req.params;
	param.id_user = req.token_access.id;
	tools_db.one('\n\
		SELECT tc.*,ts.address AS address_store,COALESCE(tg.name,\'-\') || \', \' || COALESCE(tc.destination_remark,\'-\') AS address_destination,ts.name AS store_name,ts.phone AS store_phone, usr.name AS customer_name, usr.phone AS customer_phone \n\
		FROM table_trolley_confirm tc \n\
		LEFT JOIN table_user usr ON usr.id=tc.id_customer\n\
		LEFT JOIN table_store ts ON ts.id=tc.id_store\n\
		LEFT JOIN table_location_gps tg ON tg.id=tc.id_destination\n\
		WHERE tc.id=${id_order}',param,function(order_new){
		param.id_trolley_confirm = order_new.id;
		tools_db.many('\n\
			SELECT \n\
			prod.id,prod.name,prod.price,prod.unit,\n\
			tcd.qty AS trolley_qty,tcd.id AS id_order_detail \n\
			FROM table_trolley_confirm_detail tcd\n\
			LEFT JOIN table_product prod ON prod.id=tcd.id_product\n\
			WHERE id_trolley_confirm=${id_trolley_confirm}\n\
			',param,function(products){
				order_new.products = products;
				tools_api.ok200(res,{order_new:order_new});
			},function(err){
				tools_api.error422(req,res,lang.order.a);
			});		
	},function(err){
		tools_api.error422(req,res,lang.order.a);
	});
});

router.hook('delete','/reject',['buyer','seller'],['id'],function(req,res,role,next){
	var param = req.query;

	var done = function(){
		proc_printing.pdfSO(param.id,'DITOLAK',function(){
			tools_api.success200(res);
		});
	}

	if(role==='buyer'){
		tools_db.one('UPDATE table_trolley_confirm SET is_delete_reject_buyer=TRUE, is_read_seller=FALSE, is_read_buyer=FALSE WHERE id=${id} RETURNING id',param,function(data){
			// tools_api.success200(res);
			done();
		},function(err){
			tools_api.error422(req,res,lang.generic.b);
		});
	}else{
		tools_db.one('UPDATE table_trolley_confirm SET is_delete_reject_seller=TRUE, is_read_seller=FALSE, is_read_buyer=FALSE WHERE id=${id} RETURNING id',param,function(data){
			// tools_api.success200(res);
			done();
		},function(err){
			tools_api.error422(req,res,lang.generic.b);
		});
	}
});

router.hook('get','/reject',['buyer','seller'],[],function(req,res,role,next){
	var param = {id_user:req.token_access.id};
	if(role==='buyer'){
		tools_api.paginationSupport(req,res,'\n\
			SELECT CASE WHEN NOT cf.is_read_buyer THEN 1 END AS is_read_count,cf.*,cf.fee_delivery+counted.counted AS price_total,usr.name AS name_seller,cf.recipient_name AS name_buyer \n\
			FROM table_trolley_confirm cf \n\
			LEFT JOIN (SELECT * FROM table_user WHERE id_role='+config.dynamic.role.seller+') usr ON usr.id_store=cf.id_store\n\
			LEFT JOIN (SELECT SUM(prod.price*det.qty) counted, det.id_trolley_confirm FROM table_trolley_confirm_detail det LEFT JOIN table_product prod ON prod.id=det.id_product GROUP BY det.id_trolley_confirm) counted ON counted.id_trolley_confirm=cf.id\n\
			WHERE cf.id_customer='+param.id_user+' AND cf.id IS NOT NULL AND cf.is_delete=TRUE AND is_delete_reject_buyer=FALSE\n\
			ORDER BY cf.id DESC','order_reject',undefined,undefined,undefined,'is_read_count');
	}else{
		tools_db.one('SELECT id_store FROM table_user WHERE id=${id_user}',param,function(user){
			param.id_store = user.id_store;
			tools_api.paginationSupport(req,res,'\n\
				SELECT CASE WHEN NOT cf.is_read_seller THEN 1 END AS is_read_count,cf.*,cf.fee_delivery+counted.counted AS price_total,usr.name AS name_seller,cf.recipient_name AS name_buyer \n\
				FROM table_trolley_confirm cf \n\
				LEFT JOIN (SELECT * FROM table_user WHERE id_role='+config.dynamic.role.seller+') usr ON usr.id_store=cf.id_store\n\
				LEFT JOIN (SELECT SUM(prod.price*det.qty) counted, det.id_trolley_confirm FROM table_trolley_confirm_detail det LEFT JOIN table_product prod ON prod.id=det.id_product GROUP BY det.id_trolley_confirm) counted ON counted.id_trolley_confirm=cf.id\n\
				WHERE cf.id_store='+param.id_store+' AND cf.id IS NOT NULL AND cf.is_delete=TRUE AND is_delete_reject_seller=FALSE\n\
				ORDER BY cf.id DESC','order_reject',undefined,undefined,undefined,'is_read_count');
		},function(err){
			tools_api.error422(req,res,lang.generic.a);
		});
	}
});

router.hook('get','/new',['seller','buyer'],[],function(req,res,role,next){
	var param = {id_user:req.token_access.id}; //blm di confirm agree
	if(role==='seller'){
		tools_db.one('SELECT COUNT(tc.id) AS cnt_order FROM table_user usr LEFT JOIN table_trolley_confirm tc ON tc.id_store=usr.id_store WHERE usr.id=${id_user} AND tc.is_agreed=FALSE AND tc.is_delete=FALSE',param,function(data){
			var count = {
				cnt_order:data.cnt_order
			};
			tools_api.paginationSupport(req,res,'\n\
				SELECT CASE WHEN NOT cf.is_read_seller THEN 1 END AS is_read_count,cf.*,cf.fee_delivery+counted.counted AS price_total,usr.name AS name_seller,cf.recipient_name AS name_buyer \n\
				FROM table_user usr \n\
				LEFT JOIN table_trolley_confirm cf ON cf.id_store=usr.id_store \n\
				LEFT JOIN (SELECT SUM(prod.price*det.qty) counted, det.id_trolley_confirm FROM table_trolley_confirm_detail det LEFT JOIN table_product prod ON prod.id=det.id_product GROUP BY det.id_trolley_confirm) counted ON counted.id_trolley_confirm=cf.id\n\
				WHERE cf.is_agreed=FALSE AND usr.id='+param.id_user+' AND cf.id IS NOT NULL AND cf.is_delete=FALSE \n\
				ORDER BY cf.id DESC','order_new',function(feedback){
					feedback.count = count;
					return feedback;
				},undefined,undefined,'is_read_count');
		},function(err){
			tools_api.error422(req,res,lang.order.a);
		});
		
	}else if(role==='buyer'){
		tools_api.paginationSupport(req,res,'\n\
			SELECT CASE WHEN NOT cf.is_read_buyer THEN 1 END AS is_read_count,cf.*,cf.fee_delivery+counted.counted AS price_total,usr.name AS name_seller,cf.recipient_name AS name_buyer \n\
			FROM table_trolley_confirm cf \n\
			LEFT JOIN (SELECT * FROM table_user WHERE id_role='+config.dynamic.role.seller+') usr ON usr.id_store=cf.id_store\n\
			LEFT JOIN (SELECT SUM(prod.price*det.qty) counted, det.id_trolley_confirm FROM table_trolley_confirm_detail det LEFT JOIN table_product prod ON prod.id=det.id_product GROUP BY det.id_trolley_confirm) counted ON counted.id_trolley_confirm=cf.id\n\
			WHERE cf.is_agreed=FALSE AND cf.id_customer='+param.id_user+' AND cf.id IS NOT NULL AND cf.is_delete=FALSE \n\
			ORDER BY cf.id DESC','order_new',undefined,undefined,undefined,'is_read_count');
	}
});

router.hook('get','/pay',['buyer'],[],function(req,res,role,next){
	var param = {id_user:req.token_access.id};
	tools_api.paginationSupport(req,res,'\n\
		SELECT CASE WHEN NOT tp.is_read_buyer THEN 1 END AS is_read_count,cf.*,cf.fee_delivery+counted.counted AS price_total,usr.name AS name_seller,cf.recipient_name AS name_buyer,tp.is_read_buyer AS is_read_buyer \n\
		FROM table_trolley_confirm cf\n\
		LEFT JOIN (SELECT * FROM table_user WHERE id_role='+config.dynamic.role.seller+') usr ON usr.id_store=cf.id_store \n\
		LEFT JOIN table_trolley_confirm_agree cfa ON cfa.id_confirm=cf.id \n\
		LEFT JOIN table_trolley_paid tp ON tp.id_agree=cfa.id \n\
		LEFT JOIN (\n\
			SELECT SUM(prod.price*deta.qty) counted, det.id_trolley_confirm \n\
			FROM table_trolley_confirm_detail det \n\
			LEFT JOIN table_trolley_confirm_agree_detail deta ON deta.id_confirm_detail=det.id \n\
			LEFT JOIN table_product prod ON prod.id=det.id_product \n\
			WHERE deta.id IS NOT NULL \n\
			GROUP BY det.id_trolley_confirm) counted ON counted.id_trolley_confirm=cf.id\n\
		WHERE cfa.is_paid=TRUE AND cf.id_customer='+param.id_user+' AND cfa.id IS NOT NULL AND tp.is_close!=TRUE \n\
		ORDER BY cfa.id DESC','order_paid',undefined,undefined,undefined,'is_read_count');
});

router.hook('get','/pending',['seller','buyer'],[],function(req,res,role,next){
	var param = {id_user:req.token_access.id};//belum dikirim, udah bayar
	if(role==='seller'){
		tools_api.paginationSupport(req,res,'\n\
			SELECT CASE WHEN NOT cfa.is_read_seller THEN 1 END AS is_read_count,cf.*,cf.fee_delivery+counted.counted AS price_total,usr.name AS name_seller,cf.recipient_name AS name_buyer,cfa.is_read_seller AS is_read_seller \n\
			FROM table_user usr \n\
			LEFT JOIN table_trolley_confirm cf ON cf.id_store=usr.id_store \n\
			LEFT JOIN table_trolley_confirm_agree cfa ON cfa.id_confirm=cf.id \n\
			LEFT JOIN table_trolley_paid tp ON tp.id_agree=cfa.id \n\
			LEFT JOIN (\n\
				SELECT SUM(prod.price*deta.qty) counted, det.id_trolley_confirm \n\
				FROM table_trolley_confirm_detail det \n\
				LEFT JOIN table_trolley_confirm_agree_detail deta ON deta.id_confirm_detail=det.id \n\
				LEFT JOIN table_product prod ON prod.id=det.id_product \n\
				WHERE deta.id IS NOT NULL \n\
				GROUP BY det.id_trolley_confirm) counted ON counted.id_trolley_confirm=cf.id\n\
			WHERE cfa.is_paid=TRUE AND usr.id='+param.id_user+' AND cfa.id IS NOT NULL AND tp.is_sent!=TRUE \n\
			ORDER BY cfa.id DESC','order_pending',undefined,undefined,undefined,'is_read_count');
	}else{
		tools_api.paginationSupport(req,res,'\n\
			SELECT CASE WHEN NOT cfa.is_read_buyer THEN 1 END AS is_read_count,cf.*,cf.fee_delivery+counted.counted AS price_total,usr.name AS name_seller,cf.recipient_name AS name_buyer,cfa.is_read_buyer AS is_read_buyer \n\
			FROM table_trolley_confirm cf\n\
			LEFT JOIN (SELECT * FROM table_user WHERE id_role='+config.dynamic.role.seller+') usr ON usr.id_store=cf.id_store\n\
			LEFT JOIN table_trolley_confirm_agree cfa ON cfa.id_confirm=cf.id \n\
			LEFT JOIN (\n\
				SELECT SUM(prod.price*deta.qty) counted, det.id_trolley_confirm \n\
				FROM table_trolley_confirm_detail det \n\
				LEFT JOIN table_trolley_confirm_agree_detail deta ON deta.id_confirm_detail=det.id \n\
				LEFT JOIN table_product prod ON prod.id=det.id_product \n\
				WHERE deta.id IS NOT NULL \n\
				GROUP BY det.id_trolley_confirm) counted ON counted.id_trolley_confirm=cf.id\n\
			WHERE cfa.is_paid=FALSE AND cf.id_customer='+param.id_user+' AND cfa.id IS NOT NULL AND cf.is_delete=FALSE\n\
			ORDER BY cfa.id DESC','order_pending',undefined,undefined,undefined,'is_read_count');
	}
});

router.hook('patch','/delivered/:id_order',['seller'],['remark'],function(req,res,role,next){
	var param = {id_user:req.token_access.id};
	param.id_order = req.params.id_order;
	param.remark = req.query.remark;
	tools_db.one('SELECT tca.id,tc.id_customer FROM table_trolley_confirm_agree tca LEFT JOIN table_trolley_confirm tc ON tc.id=tca.id_confirm WHERE tca.id_confirm=${id_order}',param,function(agree){
		param.id_agree = agree.id;
		tools_db.one('UPDATE table_trolley_paid SET is_sent=TRUE,is_read_seller=FALSE,is_read_buyer=FALSE,time_sent=NOW(),remark=${remark} WHERE id_agree=${id_agree} RETURNING id',param,function(data){
			//NOTIFICATION
			param.role_seller = config.dynamic.role.seller;
			tools_db.one('SELECT usr.username,usr.name FROM table_trolley_confirm tc LEFT JOIN (SELECT * FROM table_user WHERE id_role=${role_seller}) usr ON usr.id_store=tc.id_store WHERE tc.id=${id_order}',param,function(seller){
				tools_email.logSend(req.app,[seller.username],'Order Delivered','template_email_order_deliver_seller','order_deliver_seller',{
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
			          // {
			          //   fileName:'SalesOrder.pdf',
			          //   filePath: __dirname+"/../public/salesorder/SalesOrder"+param.id_order+".pdf"
			          // }
			},function(err){});
			tools_db.one('SELECT usr.username,usr.name FROM table_trolley_confirm tc LEFT JOIN table_user usr ON usr.id=tc.id_customer WHERE tc.id=${id_order}',param,function(buyer){
				tools_email.logSend(req.app,[buyer.username],'Order Delivered','template_email_order_deliver_buyer','order_deliver_buyer',{
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
			          // {
			          //   fileName:'SalesOrder.pdf',
			          //   filePath: __dirname+"/../public/salesorder/SalesOrder"+param.id_order+".pdf"
			          // }
			},function(err){});
			param.id_customer = agree.id_customer;
			tools_db.one('SELECT dev.token_fcm,usr.id_language FROM table_user usr LEFT JOIN table_device dev ON dev.id=usr.id_device WHERE usr.id=${id_customer}',param,function(user){
				param.token_fcm = user.token_fcm;
				if(param.token_fcm === null) param.token_fcm = "";
				var title = "Order Delivered";
				var message = "Order delivered by seller with remark: "+param.remark;
				var job = "trolley_sent";
				var sent = {title:title,message:message,job:job,id:param.id_order};
				if(config.dynamic.language[user.id_language] === 'id'){
					//INDONESIA
					sent.title = "Order Terkirim";
					sent.message = "Order terkirim oleh penjual dengan keterangan: "+param.remark;
				}
				param.sent = JSON.stringify(sent);
				tools_db.none('INSERT INTO table_notification (id_user,device_token,sent) VALUES (${id_customer},${token_fcm},${sent})',param,function(){},function(err){});
			},function(err){

			});
			//NOTIFICATION DONE
			tools_api.success200(res);
		},function(err){
			tools_api.error422(req,res,lang.order.d);
		});
	},function(err){
		tools_api.error422(req,res,lang.order.d);
	});
});

router.hook('get','/delivered',['seller'],[],function(req,res,role,next){
	var param = {id_user:req.token_access.id};
	tools_api.paginationSupport(req,res,'\n\
		SELECT CASE WHEN NOT cfa.is_read_seller THEN 1 END AS is_read_count,cf.*,cf.fee_delivery+counted.counted AS price_total,usr.name AS name_seller,cf.recipient_name AS name_buyer,cfa.is_read_seller AS is_read_seller \n\
		FROM table_user usr \n\
		LEFT JOIN table_trolley_confirm cf ON cf.id_store=usr.id_store \n\
		LEFT JOIN table_trolley_confirm_agree cfa ON cfa.id_confirm=cf.id \n\
		LEFT JOIN table_trolley_paid tp ON tp.id_agree=cfa.id \n\
		LEFT JOIN (\n\
			SELECT SUM(prod.price*deta.qty) counted, det.id_trolley_confirm \n\
			FROM table_trolley_confirm_detail det \n\
			LEFT JOIN table_trolley_confirm_agree_detail deta ON deta.id_confirm_detail=det.id \n\
			LEFT JOIN table_product prod ON prod.id=det.id_product \n\
			WHERE deta.id IS NOT NULL \n\
			GROUP BY det.id_trolley_confirm) counted ON counted.id_trolley_confirm=cf.id\n\
		WHERE tp.is_sent=TRUE AND tp.rating IS NULL AND usr.id='+param.id_user+' AND tp.id IS NOT NULL \n\
		ORDER BY tp.time_sent DESC','order_delivered',undefined,undefined,undefined,'is_read_count');
});

router.hook('delete','/done/:id_order',['buyer','seller'],[],function(req,res,role,next){
	var param = req.params;
	tools_db.one('SELECT id FROM table_trolley_confirm_agree WHERE id_confirm=${id_order}',param,function(agree){
		param.id_agree = agree.id;
		tools_db.one('UPDATE table_trolley_paid SET is_hide_'+role+'=TRUE WHERE id_agree=${id_agree} RETURNING id',param,function(data){
			tools_api.success200(res);
		},function(err){
			tools_api.error422(req,res,lang.order.d);
		});
	},function(err){
		tools_api.error422(req,res,lang.order.d);
	});
	
});

router.hook('get','/count',['buyer'],[],function(req,res,role,next){
	var param = {id_user:req.token_access.id};
	tools_db.one('SELECT COUNT(cf.id) AS counted, (SELECT COUNT(cf.id) FROM table_trolley_confirm cf LEFT JOIN table_trolley_confirm_agree cfa ON cfa.id_confirm=cf.id WHERE cfa.is_paid=FALSE AND cf.id_customer='+param.id_user+' AND cf.is_delete=FALSE) AS cnt_cart, (SELECT count(id) FROM table_topup WHERE is_complete=FALSE AND id_user='+param.id_user+') AS cnt_balance\n\
	FROM table_trolley_confirm cf\n\
	LEFT JOIN (SELECT * FROM table_user WHERE id_role='+config.dynamic.role.seller+') usr ON usr.id_store=cf.id_store\n\
	LEFT JOIN table_trolley_confirm_agree cfa ON cfa.id_confirm=cf.id \n\
	LEFT JOIN (\n\
		SELECT SUM(prod.price*deta.qty) counted, det.id_trolley_confirm \n\
		FROM table_trolley_confirm_detail det \n\
		LEFT JOIN table_trolley_confirm_agree_detail deta ON deta.id_confirm_detail=det.id \n\
		LEFT JOIN table_product prod ON prod.id=det.id_product \n\
		WHERE deta.id IS NOT NULL \n\
		GROUP BY det.id_trolley_confirm) counted ON counted.id_trolley_confirm=cf.id\n\
	WHERE cfa.is_paid=FALSE AND cf.id_customer=${id_user} AND cfa.id IS NOT NULL',param,function(data){
		tools_api.ok200(res,{count:data.counted,pending:{
			cnt_balance: data.cnt_balance,
			cnt_cart:data.cnt_cart
		}});
	},function(err){
		tools_api.error422(req,res,lang.order.a);
	});
});

router.hook('put','/done/:id_order',['buyer'],['review','star'],function(req,res,role,next){
	var param = req.query;
	param.id_order = req.params.id_order;
	if(parseInt(param.star)===0){
		tools_api.incompleteParameter(req,res);
		return;
	}
	tools_db.one('SELECT tca.id,tc.id_store,tc.generated_number FROM table_trolley_confirm_agree tca LEFT JOIN table_trolley_confirm tc ON tc.id=tca.id_confirm WHERE tca.id_confirm=${id_order}',param,function(agree){
		param.id_agree = agree.id;
		param.id_store = agree.id_store;
		param.generated_number = agree.generated_number;
		tools_db.one('UPDATE table_trolley_paid SET time_close=NOW(),is_close=TRUE,rating=${star}, is_read_buyer=FALSE,is_read_seller=FALSE WHERE id_agree=${id_agree} RETURNING id',param,function(data){
			//NOTIFICATION
			param.role_seller = config.dynamic.role.seller;
			tools_db.one('SELECT usr.username,usr.name FROM table_trolley_confirm tc LEFT JOIN (SELECT * FROM table_user WHERE id_role=${role_seller}) usr ON usr.id_store=tc.id_store WHERE tc.id=${id_order}',param,function(seller){
				tools_email.logSend(req.app,[seller.username],'Pesanan Selesai','template_email_order_complete_seller','order_complete_seller',{
					attachments:[
			          {
			            fileName:'tunjukmaterial.png',
			            filePath: __dirname+"/../public/images/tm_green.png",
			            cid: 'tmpicture'
			          },
			          {
			            fileName:'SalesOrder.pdf',
			            filePath: __dirname+"/../public/salesorder/SalesOrder"+param.id_order+".pdf"
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
			tools_db.one('SELECT usr.username,usr.name FROM table_trolley_confirm tc LEFT JOIN table_user usr ON usr.id=tc.id_customer WHERE tc.id=${id_order}',param,function(buyer){
				tools_email.logSend(req.app,[buyer.username],'Pesanan Selesai','template_email_order_complete_buyer','order_complete_buyer',{
					attachments:[
			          {
			            fileName:'tunjukmaterial.png',
			            filePath: __dirname+"/../public/images/tm_red.png",
			            cid: 'tmpicture'
			          },
			          {
			            fileName:'SalesOrder.pdf',
			            filePath: __dirname+"/../public/salesorder/SalesOrder"+param.id_order+".pdf"
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
			tools_db.one('SELECT dev.token_fcm,usr.id_language,usr.id FROM table_user usr LEFT JOIN table_device dev ON dev.id=usr.id_device WHERE usr.id_store=${id_store} AND usr.id_role='+config.dynamic.role.seller,param,function(user){
				param.token_fcm = user.token_fcm;
				param.id_seller = user.id;
				if(param.token_fcm === null) param.token_fcm = "";
				var title = "Order Completed";
				var message = "Order "+param.generated_number+" completed and given "+param.star+" stars from buyer.";
				var job = "trolley_done";
				var sent = {title:title,message:message,job:job,id:param.id_order};
				if(config.dynamic.language[user.id_language] === 'id'){
					//INDONESIA
					sent.title = "Order Telah Selesai";
					sent.message = "Order "+param.generated_number+" telah selesai dan diberi rating "+param.star+" bintang.";
				}
				param.sent = JSON.stringify(sent);
				tools_db.none('INSERT INTO table_notification (id_user,device_token,sent) VALUES (${id_seller},${token_fcm},${sent})',param,function(){},function(err){});
			},function(err){

			});
			//NOTIFICATION
			tools_api.success200(res);
		},function(err){
			tools_api.error422(req,res,lang.order.d);
		});
	},function(err){
		tools_api.error422(req,res,lang.order.d);
	});
});

router.hook('get','/read/order',['seller','buyer'],['id'],function(req,res,role,next){
	var param = req.query;
	if(role==='seller'){
		tools_db.one('UPDATE table_trolley_confirm SET is_read_seller=TRUE WHERE id=${id} RETURNING id',param,function(data){
			tools_api.success200(res);
		},function(err){
			tools_api.error422(req,res,lang.generic.b);
		});
	}else{
		tools_db.one('UPDATE table_trolley_confirm SET is_read_buyer=TRUE WHERE id=${id} RETURNING id',param,function(data){
			tools_api.success200(res);
		},function(err){
			tools_api.error422(req,res,lang.generic.b);
		});
	}
});

router.hook('get','/read/confirmed',['seller','buyer'],['id'],function(req,res,role,next){
	var param = req.query;
	if(role==='seller'){
		tools_db.one('UPDATE table_trolley_confirm_agree SET is_read_seller=TRUE WHERE id_confirm=${id} RETURNING id',param,function(data){
			tools_api.success200(res);
		},function(err){
			tools_api.error422(req,res,lang.generic.b);
		});
	}else{
		tools_db.one('UPDATE table_trolley_confirm_agree SET is_read_buyer=TRUE WHERE id_confirm=${id} RETURNING id',param,function(data){
			tools_api.success200(res);
		},function(err){
			tools_api.error422(req,res,lang.generic.b);
		});
	}
});

router.hook('get','/read/paid',['seller','buyer'],['id'],function(req,res,role,next){
	var param = req.query;
	tools_db.one('SELECT id FROM table_trolley_confirm_agree WHERE id_confirm=${id}',param,function(data){
		param.id_agree = data.id;
		if(role==='seller'){
			tools_db.one('UPDATE table_trolley_paid SET is_read_seller=TRUE WHERE id_agree=${id_agree} RETURNING id',param,function(data){
				tools_api.success200(res);
			},function(err){
				tools_api.error422(req,res,lang.generic.b);
			});
		}else{
			tools_db.one('UPDATE table_trolley_paid SET is_read_buyer=TRUE WHERE id_agree=${id_agree} RETURNING id',param,function(data){
				tools_api.success200(res);
			},function(err){
				tools_api.error422(req,res,lang.generic.b);
			});
		}
	},function(err){
		tools_api.error422(req,res,lang.generic.b);
	});
	
});

router.hook('get','/done',['seller','buyer'],[],function(req,res,role,next){
	var param = {id_user:req.token_access.id};
	if(role==='seller'){
		tools_api.paginationSupport(req,res,'\n\
			SELECT CASE WHEN NOT tp.is_read_seller THEN 1 END AS is_read_count,cf.*,cf.fee_delivery+counted.counted AS price_total,usr.name AS name_seller,cf.recipient_name AS name_buyer,tp.rating,tp.remark AS remark_review,tp.is_read_seller AS is_read_seller \n\
			FROM table_user usr \n\
			LEFT JOIN table_trolley_confirm cf ON cf.id_store=usr.id_store \n\
			LEFT JOIN table_trolley_confirm_agree cfa ON cfa.id_confirm=cf.id \n\
			LEFT JOIN table_trolley_paid tp ON tp.id_agree=cfa.id \n\
			LEFT JOIN (\n\
				SELECT SUM(prod.price*deta.qty) counted, det.id_trolley_confirm \n\
				FROM table_trolley_confirm_detail det \n\
				LEFT JOIN table_trolley_confirm_agree_detail deta ON deta.id_confirm_detail=det.id \n\
				LEFT JOIN table_product prod ON prod.id=det.id_product \n\
				WHERE deta.id IS NOT NULL \n\
				GROUP BY det.id_trolley_confirm) counted ON counted.id_trolley_confirm=cf.id\n\
			WHERE tp.is_sent=TRUE AND tp.is_close=TRUE AND usr.id='+param.id_user+' AND tp.id IS NOT NULL AND tp.is_hide_seller=FALSE \n\
			ORDER BY tp.id DESC','order_done',undefined,undefined,undefined,'is_read_count');
	}else{
		tools_api.paginationSupport(req,res,'\n\
			SELECT CASE WHEN NOT tp.is_read_buyer THEN 1 END AS is_read_count,cf.*,cf.fee_delivery+counted.counted AS price_total,usr.name AS name_seller,cf.recipient_name AS name_buyer,tp.rating,tp.remark AS remark_review \n\
			FROM table_trolley_confirm cf \n\
			LEFT JOIN (SELECT * FROM table_user WHERE id_role='+config.dynamic.role.seller+') usr ON usr.id_store=cf.id_store \n\
			LEFT JOIN table_trolley_confirm_agree cfa ON cfa.id_confirm=cf.id \n\
			LEFT JOIN table_trolley_paid tp ON tp.id_agree=cfa.id \n\
			LEFT JOIN (\n\
				SELECT SUM(prod.price*deta.qty) counted, det.id_trolley_confirm \n\
				FROM table_trolley_confirm_detail det \n\
				LEFT JOIN table_trolley_confirm_agree_detail deta ON deta.id_confirm_detail=det.id \n\
				LEFT JOIN table_product prod ON prod.id=det.id_product \n\
				WHERE deta.id IS NOT NULL \n\
				GROUP BY det.id_trolley_confirm) counted ON counted.id_trolley_confirm=cf.id\n\
			WHERE cf.id_customer='+param.id_user+' AND tp.id IS NOT NULL AND tp.is_hide_buyer=FALSE AND tp.is_close=TRUE \n\
			ORDER BY tp.id DESC','order_done',undefined,undefined,undefined,'is_read_count');
	}
});


module.exports = router.router;


