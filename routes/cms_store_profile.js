var express = require('express');
var router = express.Router();
var config = require(__dirname+'/../config');
var tools_db = require(__dirname+'/../tools/tools_db');
var tools_api = require(__dirname+'/../tools/tools_api');
var tools_cms = require(__dirname+'/../tools/tools_cms');
var tools_all = require(__dirname+'/../tools/tools_all');

var tools_routes = require(__dirname+'/../tools/tools_routes');

var router = tools_routes.init();

var ta = require('time-ago')();

/* GET home page. */
router.hook('get','/',['admin'],['id'],function(req,res,role,next){
	console.log("URL "+req.originalUrl);
	var param = req.query;
	if(typeof req.query.fromDate === 'undefined') param.fromDate = '2017-01-01';
	else param.fromDate = req.query.fromDate;
	if(typeof req.query.toDate === 'undefined') param.toDate = (new Date()).yyyymmdd();
	else param.toDate = req.query.toDate;
	param.store = {};
	param.user = {};
	param.defaultavatar = tools_cms.param_jade(req).getFullPath()+'/img/avatar.png';
	param.role_seller = config.dynamic.role.seller;
	var query = 2;
	var iteration = 0;
	var is_sent = false;
	var render = function(){
		if(is_sent) return;
		is_sent = true;
		res.render('cms_store_profile', {param_jade: tools_cms.param_jade(req), title: 'List Toko', param:param });
	};
	var check = function(){
		iteration++;
		if(iteration>=query)render();
	};
	tools_db.one("SELECT\n\
	rekening.name_bank AS rekening_bank,rekening.name_owner AS rekening_owner,rekening.no_rekening AS rekening_number,\n\
	usr.id AS id_user,\n\
	store.city,\n\
	store.id,\n\
	store.name,\n\
	store.address,COALESCE(store.phone,'-') AS phone,\n\
	store.is_delete,\n\
	store.lock_location,\n\
	CASE WHEN store.is_open THEN 'open' ELSE 'close' END AS is_open,\n\
	COALESCE(usr.avatar,${defaultavatar}) AS avatar,\n\
	dat.maxtu AS time_update, \n\
	COALESCE(usr.name,'-') AS owner_name,\n\
	COALESCE(usr.username,'-') AS owner_username,\n\
	COALESCE(rating.rating::text,'n/a') AS rating,\n\
	to_char(schedule.time_open,'HH24:MI') AS time_open,\n\
	to_char(schedule.time_close,'HH24:MI') AS time_close,\n\
	schedule.sun,schedule.mon,schedule.tue,schedule.wed,schedule.thu,schedule.fri,schedule.sat\n\
	FROM table_store store \n\
	LEFT JOIN (SELECT id,id_store,name,username,id_rekening,avatar FROM table_user WHERE id_role=${role_seller}) usr ON usr.id_store=store.id \n\
	LEFT JOIN table_rekening rekening ON rekening.id=usr.id_rekening\n\
	LEFT JOIN (SELECT max(time_update) AS maxtu,id_store FROM table_user GROUP BY id_store ) dat ON dat.id_store=store.id \n\
	LEFT JOIN (SELECT AVG(paid.rating) AS rating, confirm.id_store FROM table_trolley_paid paid LEFT JOIN table_trolley_confirm_agree agree ON paid.id_agree=agree.id LEFT JOIN table_trolley_confirm confirm ON confirm.id=agree.id_confirm WHERE paid.rating IS NOT NULL GROUP BY confirm.id_store) rating ON rating.id_store = store.id\n\
	LEFT JOIN table_schedule schedule ON schedule.id=store.id_schedule\n\
	WHERE store.id=${id}",param,function(user){
		var days = [];
		if(user.sun) days.push('sun');
		if(user.mon) days.push('mon');
		if(user.tue) days.push('tue');
		if(user.wed) days.push('wed');
		if(user.thu) days.push('thu');
		if(user.fri) days.push('fri');
		if(user.sat) days.push('sat');
		param.user.id = user.id_user;
		param.user.name = user.owner_name;
		param.user.username = user.owner_username;
		param.store.city = user.city;
		param.store.id = user.id;
		param.store.name = user.name;
		param.store.avatar = user.avatar;
		param.store.address = user.address;
		param.store.phone = user.phone;
		param.store.is_delete = user.is_delete;
		param.store.time_update = user.time_update;
		param.store.is_open = user.is_open;
		param.store.rating = parseFloat(user.rating).toFixed(2);
		param.store.time_open = user.time_open;
		param.store.time_close = user.time_close;
		param.store.lock_location = user.lock_location;
		param.store.days = days.join(',');
		param.store.time_updateago = ta.ago(user.time_update);
		param.user.rekening = "-";
		if(user.rekening_bank!==null){
			param.user.rekening = user.rekening_bank+"<br>No: "+user.rekening_number+"<br>a/n "+user.rekening_owner;
		}
		check();
	},function(err){
		render();
	});
	tools_db.many("SELECT to_char(sq.sq,'DD/MM') AS tanggal,COALESCE(cnt.cnt,0) AS cnt FROM (select i::date AS sq from generate_series(NOW() - INTERVAL '4 days',  NOW(), '1 day'::interval) i) sq LEFT JOIN (SELECT COUNT(id) cnt,time_create::date dt FROM table_log_tokenaccess WHERE id_user IN (SELECT id FROM table_user WHERE id_store=${id}) GROUP BY time_create::date) cnt ON cnt.dt=sq.sq",param,function(counters){
		var label = [];
		var data = {};
		var datas = [];
		counters.forEach(function(counter){
			label.push(counter.tanggal);
			datas.push(counter.cnt);
		});
		data.label = "Login";
		data.data = datas;
		param.store.login_label = label;
		param.store.login_data = data;
		check();
	},function(err){
		render();
	});
});

module.exports = router.router;