var tools_routes = require(__dirname+"/../tools/tools_routes");
var tools_api = require(__dirname+"/../tools/tools_api");
var tools_db = require(__dirname+"/../tools/tools_db");
var tools_all = require(__dirname+"/../tools/tools_all");
var tools_email = require(__dirname+"/../tools/tools_email");
var config = require(__dirname+"/../config");
var lang = require(__dirname+"/../language");
var router = tools_routes.init();
var proc_userupdate = require(__dirname+"/../proc/proc_userupdate");
var proc_login = require(__dirname+'/../proc/proc_login');
var proc_forget = require(__dirname+'/../proc/proc_forget');
var proc_setting = require(__dirname+'/../proc/proc_setting');

router.hook('patch','/employee/:id_employee/visibility',['seller'],['value'],function(req,res,role,next){
	var param = req.params;
	param.id_user = req.token_access.id;
	param.is_active = req.query.value;
	tools_db.one('UPDATE table_user SET is_active=${is_active} WHERE id=${id_employee} RETURNING id',param,function(user){
		tools_api.success200(res);
	},function(err){
		tools_api.error422(req,res,lang.employee.c);
	});
});

router.hook('patch','/employee/:id_employee',['seller'],['username','password','imei','pin'],function(req,res,role,next){
	var param = req.query;
	param.id_role = config.dynamic.role.employee;
	param.id_user = req.token_access.id;
	param.id_employee = req.params.id_employee;
	tools_db.one('SELECT id_store FROM table_user WHERE id=${id_user} AND pin=MD5(${pin})',param,function(user){
		param.id_store = user.id_store;
		tools_db.one('SELECT id_device FROM table_user WHERE id=${id_employee} AND id_store=${id_store}',param,function(user){
			param.id_device = user.id_device;
			tools_db.one('UPDATE table_user SET username=${username}, password=MD5(${password}) WHERE id=${id_employee} RETURNING id',param,function(data){
				tools_db.one('UPDATE table_device SET imei=${imei} WHERE id=${id_device} RETURNING id',param,function(data){
					tools_api.success200(res);
				},function(err){
					tools_api.error422(req,res,lang.employee.c);
				});
			},function(err){
				tools_api.error422(req,res,lang.employee.c);
			});
		},function(err){
			tools_api.error422(req,res,lang.employee.c);
		});
	},function(err){
		tools_api.error422(req,res,lang.employee.c);
	});
});

router.hook('delete','/employee/:id_user',['seller'],[],function(req,res,role,next){
	console.log('DELETE EMPLOYEE');
	var param = req.params;
	tools_db.one('SELECT id_store FROM table_user WHERE id=${id_user}',param,function(user){
		param.id_store = user.id_store;
		param.id_role = config.dynamic.role.employee;
		tools_db.one('DELETE FROM table_user WHERE id=${id_user} AND id_role=${id_role} AND id_store=${id_store} RETURNING id',param,function(user){
			tools_api.success200(res);
		},function(err){
			tools_api.error422(req,res,lang.employee.b);
		});
	},function(err){
		tools_api.error422(req,res,lang.employee.b);
	});
	
});

router.hook('get','/employee',['seller'],[],function(req,res,role,next){
	console.log('TOKEN_ACCESS '+JSON.stringify(req.token_access));
	tools_api.paginationSupport(req,res,'SELECT usr.id,usr.username,dev.imei,usr.is_active FROM table_user usr LEFT JOIN table_user seller ON seller.id_store=usr.id_store LEFT JOIN table_device dev ON dev.id=usr.id_device WHERE seller.id='+req.token_access.id+' AND usr.id_role='+config.dynamic.role.employee,'user_employee');
});

router.hook('put','/employee',['seller'],['username','imei','password','pin'],function(req,res,role,next){
	console.log('INSERT EMPLOYEE');
	var param = req.query;
	param.id_role = config.dynamic.role.employee;
	param.id_user = req.token_access.id;
	tools_db.one('SELECT id_store FROM table_user WHERE id=${id_user} AND pin=MD5(${pin})',param,function(user){
		param.id_store = user.id_store;
		tools_db.one('INSERT INTO table_device (imei) VALUES (${imei}) RETURNING id',param,function(device){
			param.id_device = device.id;
			tools_db.one('INSERT INTO table_user (username,id_role,password,id_store,id_device) VALUES (${username},${id_role},MD5(${password}),${id_store},${id_device}) RETURNING id',param,function(user){
				tools_api.success200(res);
			},function(err){
				tools_api.error422(req,res,lang.employee.a);
			});
		},function(err){
			tools_api.error422(req,res,lang.employee.a);
		});
	},function(err){
		tools_api.error422(req,res,lang.employee.a);
	});
});

router.hook("post","/login",[],["username","password"],proc_login.login);
router.hook("post","/forget",[],['email'],function(req,res,role,next){
	var param = req.body;
	if(typeof param.password === 'undefined' || typeof param.authcode==='undefined'){
		proc_forget.randomize(req,res);
	}else{
		proc_forget.challenge(req,res);
	}
});

router.hook('get','/',['buyer','seller','admin'],[],function(req,res,role,next){
	tools_db.one('\n\
		SELECT usr.*,NOW() AS time_update, \n\
		store.id AS store_id,store.name AS store_name,store.address AS store_address,store.phone AS store_phone,store.avatar AS store_avatar,store.is_open AS store_is_open,\n\
		rekening.id AS rekening_id,rekening.name_bank AS rekening_name,rekening.name_owner AS rekening_owner,rekening.no_rekening AS rekening_number,\n\
		ST_X(location.geom_location::geometry) AS store_longitude,ST_Y(location.geom_location::geometry) AS store_latitude,\n\
		schedule.time_open AS store_time_open,schedule.time_close AS store_time_close, schedule.sun AS store_sun, schedule.mon AS store_mon, schedule.tue AS store_tue, schedule.wed AS store_wed, schedule.thu AS store_thu,schedule.fri AS store_fri, schedule.sat AS store_sat\n\
		FROM table_user usr \n\
		LEFT JOIN table_store store ON store.id=usr.id_store\n\
		LEFT JOIN table_location_gps location ON location.id=store.id_location\n\
		LEFT JOIN table_rekening rekening ON rekening.id=usr.id_rekening\n\
		LEFT JOIN table_schedule schedule ON schedule.id=store.id_schedule\n\
		WHERE usr.id=$1',req.token_access.id,function(user){
		user.role = config.dynamic.role[user.id_role];
		user.language = config.dynamic.language[user.id_language];
		user.rekening = {
			id:user.rekening_id,
			name:user.rekening_name,
			owner:user.rekening_owner,
			number:user.rekening_number
		};
		if(config.dynamic.role[user.id_role]==='seller'){
			user.store = {
				id:user.store_id,
				is_open:user.store_is_open,
				avatar:user.store_avatar,
				name:user.store_name,
				address:user.store_address,
				phone:user.store_phone,
				location_longitude:user.store_longitude,
				location_latitude:user.store_latitude
			};
			user.schedule = {
				time_open: user.store_time_open,
				time_close: user.store_time_close,
				sun: user.store_sun,
				mon: user.store_mon,
				tue: user.store_tue,
				wed: user.store_wed,
				thu: user.store_thu,
				fri: user.store_fri,
				sat: user.store_sat
			};
		}
		delete user.id_role;
		delete user.id_language;
		delete user.is_login;
		delete user.password;
		delete user.pin;
		delete user.id_rekening;
		delete user.id_store;
		delete user.store_id;
		delete user.store_name;
		delete user.store_address;
		delete user.store_phone;
		delete user.rekening_id;
		delete user.rekening_number;
		delete user.rekening_name;
		delete user.rekening_owner;
		delete user.auth_forgetpassword;
		delete user.store_longitude;
		delete user.store_latitude;
		delete user.store_time_open;
		delete user.store_time_close;
		delete user.store_sun;
		delete user.store_mon;
		delete user.store_tue;
		delete user.store_wed;
		delete user.store_thu;
		delete user.store_fri;
		delete user.store_sat;
		console.log("READY");
		proc_setting.query(function(settings){
			tools_api.ok200(res,{user:user,settings:settings});
		},function(err){
			console.log("GAGAL");
			tools_api.error422(req,res,lang.user.a);
		});	
	},function(err){
		tools_api.error422(req,res,lang.user.a);
	});
});

router.hook("get","/logout",[],[],function(req,res,role,next){
	tools_api.success200(res);
});
router.hook('post','/register/dummy',[],['language','longitude','latitude','imei','model','os'],function(req, res, role, next){
	//Generate Dummy User
	var rstring = 'potentialbuyer'+(new Date).getTime()+''+tools_all.genRandom(5);
	var query = req.body;
	if(typeof query.imsi === 'undefined' || query.imsi ==='') query.imsi = null;
	if(typeof query.imei === 'undefined' || query.imei ==='') query.imei = null;
	var param = {imsi:query.imsi,imei:query.imei,username:rstring,password:rstring,mode:'buyer',language:query.language,longitude:query.longitude,latitude:query.latitude,model:query.model,os:query.os};
	param.id_role = config.dynamic.role[param.mode];
	param.id_language = config.dynamic.language[param.language];
	tools_db.one("INSERT INTO table_location_gps (name,description,geom_location) VALUES (\'Dummy registration\',${username},ST_GeographyFromText('SRID=4326;POINT("+param.longitude+" "+param.latitude+")')) RETURNING id",param,function(location){
		param.id_location = location.id;
		tools_db.one('INSERT INTO table_device (imei,imsi,model,os,id_location) VALUES (${imei},${imsi},${model},${os},${id_location}) RETURNING id',param,function(device){
			param.id_device = device.id;
			tools_db.one('INSERT INTO table_user (username,password,id_role,id_language,id_device) VALUES (${username},NULL,${id_role},${id_language},${id_device}) RETURNING *',param,function(user){				
				var amount = 0;
				var balance_current = parseInt(user.saldo);
				var balance_after = amount+balance_current;
				var parambalancehistory = {
					remark_id:'Registrasi',
					remark_en:'Registration',
					remark_zh:'Registration',
					id_user:user.id,
					is_plus:true,
					amount:amount,
					balance_current:balance_current,
					balance_after:balance_after,
					order:'-'
				};
				tools_db.none('INSERT INTO table_balance_history (remark_id,remark_en,remark_zh,id_user,is_plus,amount,balance_current,balance_after,order_number) VALUES (${remark_id},${remark_en},${remark_zh},${id_user},${is_plus},${amount},${balance_current},${balance_after},${order})',parambalancehistory,function(){},function(err){});
				req.body = param;
				proc_login.login(req,res);
			},function(err){
				if(parseInt(err.code)===23505){
					tools_api.error422(req,res,lang.register.b);
					return;
				}
				tools_api.error422(req,res,lang.register.c);
			});
		},function(err){
			tools_api.error422(req,res,lang.register.h);
		});
	},function(err){
		tools_api.error422(req,res,lang.register.g);
	});
	
});

router.hook('post','/register/seller',[],['store_phone','language','username','store_owner','store_name','store_address','store_city','password','pin','store_longitude','store_latitude','store_open','store_close','is_sunday','is_monday','is_tuesday','is_wednesday','is_thursday','is_friday','is_saturday','imei','model','os','bank_name','bank_accnbr','bank_owner'],function(req,res,role,next){
	var param = req.body;
	if(typeof config.dynamic.language[param.language] === 'undefined'){
		tools_api.error422(req,res,lang.register.d);
		return;
	}
	if(typeof param.imei === 'undefined' || param.imei === '') param.imei = null;
	if(typeof param.imsi === 'undefined' || param.imsi === '') param.imsi = null;
	tools_db.one('INSERT INTO table_rekening (name_bank,name_owner,no_rekening) VALUES (${bank_name},${bank_owner},${bank_accnbr}) RETURNING id',param,function(rekening){
		param.id_rekening = rekening.id;
		tools_db.one('INSERT INTO table_device (imei,imsi,model,os) VALUES (${imei},${imsi},${model},${os}) RETURNING id',param,function(device){
			param.id_device = device.id;
			param.id_role = config.dynamic.role['seller'];
			param.id_language = config.dynamic.language[param.language];
			//Buat store dulu
			tools_db.one("INSERT INTO table_location_gps (name,description,geom_location) VALUES (\'User registration\',${username},ST_GeographyFromText('SRID=4326;POINT("+param.store_longitude+" "+param.store_latitude+")')) RETURNING id",param,function(location){
				param.id_location = location.id;
				tools_db.one('INSERT INTO table_schedule (time_open,time_close,sun,mon,tue,wed,thu,fri,sat) VALUES (${store_open},${store_close},${is_sunday},${is_monday},${is_tuesday},${is_wednesday},${is_thursday},${is_friday},${is_saturday}) RETURNING id',param,function(schedule){
					param.id_schedule = schedule.id;
					tools_db.one('INSERT INTO table_store (name,address,id_location,id_schedule,phone,city) VALUES (${store_name},${store_address},${id_location},${id_schedule},${store_phone},${store_city}) RETURNING id',param,function(store){
						param.id_store = store.id;
						tools_db.none('INSERT INTO table_product_category (name,description,id_store,id_template) SELECT name,description,${id_store},id FROM template_product_category ORDER BY id ASC',param,function(){},function(err){});
						tools_db.one('INSERT INTO table_user (name,username,password,id_role,id_language,id_store,id_device,pin,id_rekening) VALUES (${store_owner},${username},MD5(${password}),${id_role},${id_language},${id_store},${id_device},MD5(${pin}),${id_rekening}) RETURNING *',param,function(user){
							tools_email.logSend(req.app,[user.username],'Seller Registration','template_email_register_seller','seller_register',{
								attachments:[
									{
										fileName:'tunjukmaterial.png',
										filePath: __dirname+"/../public/images/tm_green.png",
										cid: 'tmpicture'
									}
								],
								name: param.store_owner,
								support:{
									phone: config.setting.support_phone,
									email: config.setting.support_email,
									operationaltime: config.setting.support_operationaltime
								}
							});
							param.id_user = user.id;
							proc_login.login(req,res);
						},function(err){
							tools_db.one('DELETE FROM table_store WHERE id=$1 RETURNING id',param.id_store,function(data){},function(err){});
							tools_db.one('DELETE FROM table_schedule WHERE id=$1 RETURNING id',param.id_schedule,function(data){},function(err){});
							tools_db.one('DELETE FROM table_location_gps WHERE id=$1 RETURNING id',param.id_location,function(data){},function(err){});
							tools_db.one('DELETE FROM table_device WHERE id=$1 RETURNING id',param.id_device,function(data){},function(err){});
							tools_db.one('DELETE FROM table_rekening WHERE id=$1 RETURNING id',param.id_rekening,function(data){},function(err){});
							if(parseInt(err.code)===23505){
								tools_api.error422(req,res,lang.register.b);
								return;
							}
							tools_api.error422(req,res,lang.register.c);
						});
					},function(err){
						tools_api.error422(req,res,lang.register.c);
					});
				},function(err){
					tools_api.error422(req,res,lang.register.c);
				});
			},function(err){
				tools_api.error422(req,res,lang.register.c);
			});
			
		},function(err){
			tools_api.error422(req,res,lang.register.h);
		});
	},function(err){
		tools_api.error422(req,res,lang.register.e);
	});
});

router.hook("post","/register",[],['phone','name','username','password','mode','language','longitude','latitude','pin','imei','model','os'],function(req, res, role, next){
	var param = req.body;
	param.name_bank = null;
	param.name_owner = null;
	param.no_rekening = null;
	//Buyer only, seller created another one to avoid confusion
	if(param.mode!=='buyer'){
		tools_api.error422(req,res,lang.register.a);
		return;
	}
	if(typeof config.dynamic.language[param.language] === 'undefined'){
		tools_api.error422(req,res,lang.register.d);
		return;
	}
	if(param.mode==="seller"){
		if(typeof param.store_name ==='undefined' || param.store_name === '' ||
			typeof param.store_address === 'undefined' || param.store_address === '' ||
			typeof param.store_phone === 'undefined' || param.store_phone === '' ||
			typeof param.store_schedule === 'undefiend' || param.store_schedule === ''
			){
			tools_api.incompleteParameter(req,res);
			return;
		}
		try{
			var temp = JSON.parse(param.store_schedule);
		}catch(err){
			tools_api.incompleteParameter(req,res);
		}
	}
	if(typeof param.imei === 'undefined' || param.imei === '') param.imei = null;
	if(typeof param.imsi === 'undefined' || param.imsi === '') param.imsi = null;
	param.id_rekening = null;
	param.id_store = null;
	param.id_location = null;
	param.id_device = null;
	var createUser = function(){
		console.log('Dynamic: '+JSON.stringify(config.dynamic));
		param.id_role = config.dynamic.role[param.mode];
		param.id_language = config.dynamic.language[param.language];
		tools_db.one('INSERT INTO table_user (phone,name,username,password,id_role,id_language,id_rekening,id_store,id_device,pin) VALUES (${phone},${name},${username},MD5(${password}),${id_role},${id_language},${id_rekening},${id_store},${id_device},MD5(${pin})) RETURNING *',param,function(user){
			tools_email.logSend(req.app,[user.username],'Buyer Registration','template_email_register_buyer','buyer_register',{
				attachments:[
					{
						fileName:'tunjukmaterial.png',
						filePath: __dirname+"/../public/images/tm_red.png",
						cid: 'tmpicture'
					}
				],
				name: param.name,
				support:{
					phone: config.setting.support_phone,
					email: config.setting.support_email,
					operationaltime: config.setting.support_operationaltime
				}
			});
			param.id_user = user.id;
			proc_login.login(req,res);
		},function(err){
			if(parseInt(err.code)===23505){
				tools_api.error422(req,res,lang.register.b);
				return;
			}
			tools_api.error422(req,res,lang.register.c);
		});
	};

	var checkoint_i = 0;

	var checkpoint = function(){
		checkoint_i++;
		if(checkoint_i>=2){
			if(param.mode==='buyer'){
				//Langsung bikin user dan langsung login
				createUser();
			}else if(param.mode==='seller'){
				//Bikin schedule dulu
				tools_db.one('INSERT INTO table_schedule (time_open,time_close,sun,mon,tue,wed,thu,fri,sat) VALUES (${time_open},${time_close},${sun},${mon},${tue},${wed},${thu},${fri},${sat}) RETURNING id',JSON.parse(param.store_schedule),function(schedule){
					param.id_schedule = schedule.id;
					tools_db.one('INSERT INTO table_store (name,address,phone,id_location,id_schedule) VALUES (${store_name},${store_address},${store_phone},${id_location},${id_schedule}) RETURNING id',param,function(store){
						param.id_store = store.id;
						createUser();
					},function(err){
						tools_api.error422(req,res,lang.register.f);
					});
				},function(err){
					tools_api.error422(req,res,lang.register.i);
				});
			}
		}
	};

	//CREATE LOCATION FIRST
	tools_db.one("INSERT INTO table_location_gps (name,description,geom_location) VALUES (\'User registration\',${username},ST_GeographyFromText('SRID=4326;POINT("+param.longitude+" "+param.latitude+")')) RETURNING id",param,function(location){
		param.id_location = location.id;
		tools_db.one('INSERT INTO table_device (imei,imsi,model,os,id_location) VALUES (${imei},${imsi},${model},${os},${id_location}) RETURNING id',param,function(device){
			param.id_device = device.id;
			checkpoint();
		},function(err){
			tools_api.error422(req,res,lang.register.h);
		});
	},function(err){
		tools_api.error422(req,res,lang.register.g);
	});

	//CREATE REKENING FIRST
	tools_db.one('INSERT INTO table_rekening (name_bank,name_owner,no_rekening) VALUES (${name_bank},${name_owner},${no_rekening}) RETURNING id',param,function(rekening){
		param.id_rekening = rekening.id;
		checkpoint();
	},function(err){
		tools_api.error422(req,res,lang.register.e);
	});
	
	
});

router.hook("post","/socmed",[],['socmed','token','language'],function(req,res,role,next){
	delete req.body.bypass;
	var param = req.body;
	if(param.longitude === null || param.longitude === 'null' || param.longitude === '') param.longitude = 0;
	if(param.latitude === null || param.latitude === 'null' || param.latitude === '') param.latitude = 0;
	param.username = param.email;
	param.id_role = config.dynamic.role['buyer'];
	param.id_language = config.dynamic.language[param.language];
	param.id_socmed = config.dynamic.socmed[param.socmed];
	param.id_from_socmed = null;
	if(param.email === ''){
		tools_api.error422(req,res,lang.facebook.a);
		return;
	}
	if(typeof param.id_role === 'undefined' || typeof param.id_language === 'undefined' || typeof param.id_socmed === 'undefined'){
		tools_api.incompleteParameter(req,res);
		return;
	}
	//Query based on socmed and token first --> skip
	if(typeof param.imsi === 'undefined' || param.imsi ==='') param.imsi = null;
	if(typeof param.imei === 'undefined' || param.imei ==='') param.imei = null;
	tools_db.one('INSERT INTO table_location_gps (name,description,geom_location) VALUES (\'Socmed registration\',${username},ST_GeographyFromText(\'SRID=4326;POINT('+param.longitude+' '+param.latitude+')\')) RETURNING id',param,function(location){
		param.id_location = location.id;
		tools_db.one('INSERT INTO table_device (imei,imsi,model,os,id_location) VALUES (${imei},${imsi},${model},${os},${id_location}) RETURNING id',param,function(device){
			param.id_device = device.id;
			tools_db.one('INSERT INTO table_user (username,password,id_role,id_language,id_device) VALUES (${username},MD5(MD5(MD5(${username}))),${id_role},${id_language},${id_device}) RETURNING *,MD5(MD5(${username})) AS usernameaspassword',param,function(user){
				req.body.password = user.usernameaspassword;
				param.id_user = user.id;
				tools_db.one('INSERT INTO table_socmed (id_user,id_socmed,id_from_socmed,email_from_socmed,token) VALUES (${id_user},${id_socmed},${id_from_socmed},${username},${token}) RETURNING *',param,function(data){},function(err){});
				proc_login.login(req,res);
			},function(err){
				if(typeof err!=='undefined' && err!==null && typeof err.code!=='undefined' && err.code!==null && parseInt(err.code)===23505){
					//UPDATE TOKEN FIRST
					tools_db.one('SELECT id,id_role FROM table_user WHERE username=${username}',param,function(user){
						if(parseInt(user.id_role)!==parseInt(config.dynamic.role.buyer)){
							tools_api.error422(req,res,lang.register.j);
							return;
						}
						param.id_user = user.id;
						tools_db.one('UPDATE table_socmed SET token=${token} WHERE id_user=${id_user} RETURNING id',param,function(socmed){
							req.body.password = "";
							req.body.bypass = true;
							proc_login.login(req,res);
						},function(err){
							tools_db.one('INSERT INTO table_socmed (id_user,id_socmed,id_from_socmed,email_from_socmed,token) VALUES (${id_user},${id_socmed},${id_from_socmed},${username},${token}) RETURNING *',param,function(data){
								req.body.password = "";
								req.body.bypass = true;
								proc_login.login(req,res);
							},function(err){
								tools_api.error422(req,res,lang.register.c);
							});
						});
					},function(err){
						tools_api.error422(req,res,lang.register.c);
					});
					return;
				}
				tools_api.error422(req,res,lang.register.c);
			});
		},function(err){
			tools_api.error422(req,res,lang.register.h);
		});
	},function(err){
		tools_api.error422(req,res,lang.register.g);
	});
});

router.hook("post","/",[],[],function(req,res,role,next){
	var param = req.params;
	var body = req.body;
	param.id_user = req.token_access.id;
	if(typeof body.language!=='undefined' || typeof config.dynamic.language[body.language]!=='undefined'){
		proc_userupdate.updateBahasa(param.id_user,body.language,function(language){
			tools_api.ok200(res,{user:{language:language,token_access:tools_api.genTokenAccessUpdateLang(req,config.dynamic.language[language])}});
		},function(err){
			tools_api.error422(req,res,lang.userupdate.a);
		});
		return;
	}
	tools_api.error422(req,res,lang.userupdate.a);
});

router.hook('patch','/avatar',['buyer','seller'],['new'],function(req,res,role,next){
	var param = req.query;
	param.id_user = req.token_access.id;
	tools_db.one('UPDATE table_user SET avatar=${new} WHERE id=${id_user} RETURNING avatar',param,function(user){
		tools_api.ok200(res,{user:user});
	},function(err){
		tools_api.error422(req,res,lang.userupdate.b);
	});
});
router.hook('patch','/name',['buyer','seller'],['new'],function(req,res,role,next){
	var param = req.query;
	param.id_user = req.token_access.id;
	tools_db.one('UPDATE table_user SET name=${new} WHERE id=${id_user} RETURNING name',param,function(user){
		tools_api.ok200(res,{user:user});
	},function(err){
		tools_api.error422(req,res,lang.userupdate.d);
	});
});
router.hook('patch','/username',['buyer','seller'],['new'],function(req,res,role,next){
	var param = req.query;
	param.id_user = req.token_access.id;
	tools_db.one('UPDATE table_user SET username=${new} WHERE id=${id_user} RETURNING username,name',param,function(user){
		var img = "tm_red.png";
		if(role==='seller') img = "tm_green.png";
		tools_email.logSend(req.app,[user.username],'Change username of TM','template_email_username_change','username_change',{
			attachments:[
				{
					fileName:'tunjukmaterial.png',
					filePath: __dirname+"/../public/images/"+img,
					cid: 'tmpicture'
				}
			],
			name: user.name,
			support:{
				phone: config.setting.support_phone,
				email: config.setting.support_email,
				operationaltime: config.setting.support_operationaltime
			}
		});
		tools_api.ok200(res,{user:user});
	},function(err){
		if(parseInt(err.code)===23505){
			tools_api.error422(req,res,lang.userupdate.j);
			return;
		}
		tools_api.error422(req,res,lang.userupdate.e);
	});
});
router.hook('patch','/phone',['buyer'],['new'],function(req,res,role,next){
	var param = req.query;
	param.id_user = req.token_access.id;
	tools_db.one('UPDATE table_user SET phone=${new} WHERE id=${id_user} RETURNING phone',param,function(user){
		tools_api.ok200(res,{user:user});
	},function(err){
		tools_api.error422(req,res,lang.userupdate.f);
	});
});
router.hook('patch','/address',['buyer'],['new'],function(req,res,role,next){
	var param = req.query;
	param.id_user = req.token_access.id;
	tools_db.one('UPDATE table_user SET address=${new} WHERE id=${id_user} RETURNING address',param,function(user){
		tools_api.ok200(res,{user:user});
	},function(err){
		tools_api.error422(req,res,lang.userupdate.g);
	});
});

router.hook('post','/skip',['buyer'],['username','name','phone','password','pin'],function(req,res,role,next){
	delete req.body.bypass;
	var param = req.body;
	param.name_bank = null;
	param.name_owner = null;
	param.no_rekening = null;
	param.id_user = req.token_access.id;
	tools_db.one('INSERT INTO table_rekening (name_bank,name_owner,no_rekening) VALUES (${name_bank},${name_owner},${no_rekening}) RETURNING id',param,function(rekening){
		param.id_rekening = rekening.id;
		tools_db.one('UPDATE table_user SET username=${username}, name=${name}, phone=${phone}, password=MD5(${password}), pin=MD5(${pin}), id_rekening=${id_rekening} WHERE id_rekening IS NULL AND pin IS NULL AND (password IS NULL OR password=MD5(MD5(MD5(${username})))) AND name IS NULL AND (substring(username,1,14)=\'potentialbuyer\' OR username=${username}) AND phone IS NULL AND id=${id_user} RETURNING id',param,function(data){
			proc_login.login(req,res);
		},function(err){
			if(parseInt(err.code)===23505){
				tools_api.error422(req,res,lang.register.b);
			}else{
				tools_db.one('SELECT * FROM table_user WHERE id=${id_user} AND username=${username}',param,function(data){
					req.body.bypass = true;
					proc_login.login(req,res);
				},function(err){
					tools_api.error422(req,res,lang.register.c);
				});
			}
		});
	},function(err){
		tools_api.error422(req,res,lang.register.e);
	});
});

router.hook('patch','/password',['buyer','seller'],['new','old','pin'],function(req,res,role,next){
	var param = req.query;
	param.id_user = req.token_access.id;
	tools_db.one('UPDATE table_user SET password=MD5(${new}) WHERE id=${id_user} AND (password=MD5(${old}) OR password IS NULL) AND pin=MD5(${pin}) RETURNING id,name,username',param,function(user){
		var img = "tm_red.png";
		if(role==='seller') img = "tm_green.png";
		tools_email.logSend(req.app,[user.username],'Change password of TM','template_email_password_change','password_change',{
			attachments:[
				{
					fileName:'tunjukmaterial.png',
					filePath: __dirname+"/../public/images/"+img,
					cid: 'tmpicture'
				}
			],
			name: user.name,
			support:{
				phone: config.setting.support_phone,
				email: config.setting.support_email,
				operationaltime: config.setting.support_operationaltime
			}
		});
		tools_api.ok200(res,{user:user});
	},function(err){
		tools_api.error422(req,res,lang.userupdate.i);
	});
});


router.hook('patch','/pin',['buyer','seller'],['new','old'],function(req,res,role,next){
	var param = req.query;
	if(param.new.length<6){
		tools_api.error422(req,res,lang.userupdate.c);
		return;
	}
	param.id_user = req.token_access.id;
	tools_db.one('UPDATE table_user SET pin=MD5(${new}) WHERE id=${id_user} AND (pin=MD5(${old}) OR pin IS NULL) RETURNING id,name,username',param,function(user){
		var img = "tm_red.png";
		if(role==='seller') img = "tm_green.png";
		tools_email.logSend(req.app,[user.username],'Change PIN of TM','template_email_pin_change','pin_change',{
			attachments:[
				{
					fileName:'tunjukmaterial.png',
					filePath: __dirname+"/../public/images/"+img,
					cid: 'tmpicture'
				}
			],
			name: user.name,
			support:{
				phone: config.setting.support_phone,
				email: config.setting.support_email,
				operationaltime: config.setting.support_operationaltime
			}
		});
		tools_api.success200(res);
	},function(err){
		tools_api.error422(req,res,lang.userupdate.c);
	});
});

router.hook('patch','/bank',['buyer','seller'],['name','number','owner','pin'],function(req,res,role,next){
	var param = req.query;
	tools_db.one('INSERT INTO table_rekening (name_bank,name_owner,no_rekening) VALUES (${name},${owner},${number}) RETURNING id,name_bank AS name,name_owner AS owner,no_rekening AS number',param,function(rekening){
		param.id_rekening = rekening.id;
		param.id_user = req.token_access.id;
		tools_db.one('UPDATE table_user SET id_rekening=${id_rekening} WHERE id=${id_user} AND pin=MD5(${pin}) RETURNING id',param,function(user){
			tools_api.ok200(res,{rekening:rekening});
		},function(err){
			tools_api.error422(req,res,lang.userupdate.h);
		});
	},function(err){
		tools_api.error422(req,res,lang.userupdate.h);
	});
});


module.exports = router.router;
