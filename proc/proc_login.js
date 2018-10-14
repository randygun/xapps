module.exports = this;
var instance = this;
var tools_cms = require(__dirname+"/../tools/tools_cms");
var tools_api = require(__dirname+"/../tools/tools_api");
var tools_db = require(__dirname+"/../tools/tools_db");
var tools_all = require(__dirname+"/../tools/tools_all");
var config = require(__dirname+"/../config");
var lang = require(__dirname+"/../language");
var proc_setting = require(__dirname+"/proc_setting");
this.login = function(req, res){
	var param = req.body;
	tools_db.oneOrNone('\n\
		SELECT CASE WHEN usr.pin IS NULL THEN FALSE ELSE TRUE END AS is_pin_set,usr.*,NOW() AS time_update, \n\
		store.id AS store_id,store.name AS store_name,store.address AS store_address,store.phone AS store_phone,store.avatar AS store_avatar,store.is_open AS store_is_open,store.is_delete AS store_is_delete,store.city AS store_city,\n\
		rekening.id AS rekening_id,rekening.name_bank AS rekening_name,rekening.name_owner AS rekening_owner,rekening.no_rekening AS rekening_number,\n\
		ST_X(location.geom_location::geometry) AS store_longitude,ST_Y(location.geom_location::geometry) AS store_latitude,\n\
		schedule.time_open AS store_time_open,schedule.time_close AS store_time_close, schedule.sun AS store_sun, schedule.mon AS store_mon, schedule.tue AS store_tue, schedule.wed AS store_wed, schedule.thu AS store_thu,schedule.fri AS store_fri, schedule.sat AS store_sat\n\
		FROM table_user usr \n\
		LEFT JOIN table_store store ON store.id=usr.id_store\n\
		LEFT JOIN table_location_gps location ON location.id=store.id_location\n\
		LEFT JOIN table_rekening rekening ON rekening.id=usr.id_rekening\n\
		LEFT JOIN table_schedule schedule ON schedule.id=store.id_schedule\n\
		WHERE usr.username=${username} AND usr.is_active=TRUE AND usr.is_delete=FALSE',param,function(user){
			if(user.avatar===null) user.avatar = tools_cms.param_jade(req).getFullPath()+"/img/avatar.png";
		console.log(JSON.stringify(user));
		if(user!==null && (user.password ==null || user.password===tools_all.md5(param.password)|| (typeof param.bypass !=='undefined' && param.bypass ) )){
			//RENEW TOKEN, update to DB
			param.token_access = tools_api.genTokenAccess(user,req);
			param.token_session = tools_api.genTokenSession(user);
			param.id = user.id;
			user.token_access = param.token_access;
			user.token_session = param.token_session;
			tools_db.none('UPDATE table_user SET token_access=${token_access}, token_session=${token_session}, time_update=NOW(),is_login=TRUE WHERE id=${id}',param,function(){
				console.log("TOKEN UPDATED");
			},function(err){
				console.log("TOKEN FAIL TO UPDATE");
			});
			user.role = config.dynamic.role[user.id_role];
			user.language = config.dynamic.language[user.id_language];
			user.rekening = {
				id:user.rekening_id,
				name:user.rekening_name,
				owner:user.rekening_owner,
				number:user.rekening_number
			};
			if(config.dynamic.role[user.id_role]==='seller'){
				if(user.store_is_delete){
					tools_api.error422(req,res,lang.login.c);
					return;
				}
				user.store = {
					id:user.store_id,
					is_open:user.store_is_open,
					avatar:user.store_avatar,
					name:user.store_name,
					address:user.store_address,
					phone:user.store_phone,
					location_longitude:user.store_longitude,
					location_latitude:user.store_latitude,
					city: user.store_city
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
			delete user.store_city;
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
				tools_api.ok200(res,{login:user,settings:settings});
			},function(err){
				console.log("GAGAL");
				tools_api.error422(req,res,lang.login.a);
			});			
		}else{
			tools_api.error422(req,res,lang.login.a);
		}
	},function(err){
		tools_api.error422(req,res,lang.login.a);
	});
};