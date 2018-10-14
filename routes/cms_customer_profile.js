var express = require('express');
var router = express.Router();
var tools_db = require(__dirname+'/../tools/tools_db');
var tools_api = require(__dirname+'/../tools/tools_api');
var tools_cms = require(__dirname+'/../tools/tools_cms');
var tools_all = require(__dirname+'/../tools/tools_all');
var tools_routes = require(__dirname+'/../tools/tools_routes');
var config = require(__dirname+'/../config');

var router = tools_routes.init();

var ta = require('time-ago')();

router.hook('get','/',['admin'],['id','mode'],function(req,res,role,next){
	console.log("URL "+req.originalUrl);
	var param = req.query;
	param.user = {};
	param.defaultavatar = tools_cms.param_jade(req).getFullPath()+'/img/avatar.png';
	var query = 2;
	var iteration = 0;
	var is_sent = false;
	var render = function(){
		if(is_sent) return;
		is_sent = true;
		res.render('cms_customer_profile', {param_jade: tools_cms.param_jade(req), title: 'Profil Customer', param:param });
	};
	var check = function(){
		iteration++;
		if(iteration>=query)render();
	};
	tools_db.one("\n\
		SELECT \n\
		usr.is_active,COALESCE(usr.name,'-') AS name,\n\
		COALESCE(usr.avatar, ${defaultavatar}) AS avatar,\n\
		usr.id,\n\
		COALESCE(usr.saldo,0) AS saldo,\n\
		COALESCE(usr.address,'-') AS address,\n\
		COALESCE(usr.phone,'-') AS phone,\n\
		usr.time_update, \n\
		COALESCE(rek.name_bank,'-') AS name_bank,\n\
		COALESCE(rek.name_owner,'-') AS name_owner,\n\
		COALESCE(rek.no_rekening,'-') AS no_rekening,\n\
		usr.id_language,usr.username \n\
		FROM table_user usr \n\
		LEFT JOIN table_rekening rek ON rek.id=usr.id_rekening\n\
		WHERE usr.id=${id}",param,function(user){
		param.user.time_updateago = ta.ago(user.time_update);
		param.user.username = user.username;
		param.user.language = config.dynamic.language[""+user.id_language];
		param.user.id = user.id;
		param.user.name = user.name;
		param.user.avatar = user.avatar;
		param.user.saldo = user.saldo;
		param.user.address = user.address;
		param.user.phone = user.phone;
		param.user.time_update = user.time_update;
		param.user.is_active = user.is_active;
		param.rekening = {
			bank: user.name_bank,
			owner: user.name_owner,
			number: user.no_rekening
		};
		check();
	},function(err){
		render();
	});
	tools_db.many("SELECT to_char(sq.sq,'DD/MM') AS tanggal,COALESCE(cnt.cnt,0) AS cnt FROM (select i::date AS sq from generate_series(NOW() - INTERVAL '4 days',  NOW(), '1 day'::interval) i) sq LEFT JOIN (SELECT COUNT(id) cnt,time_create::date dt FROM table_log_tokenaccess WHERE id_user=${id} GROUP BY time_create::date) cnt ON cnt.dt=sq.sq",param,function(counters){
		var label = [];
		var data = {};
		var datas = [];
		counters.forEach(function(counter){
			label.push(counter.tanggal);
			datas.push(counter.cnt);
		});
		data.label = "Login";
		data.data = datas;
		param.user.login_label = label;
		param.user.login_data = data;
		check();
	},function(err){
		render();
	});
});

module.exports = router.router;
