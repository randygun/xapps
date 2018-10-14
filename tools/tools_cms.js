var tools_api = require(__dirname+"/tools_api");
var tools_all = require(__dirname+"/tools_all");
var tools_db = require(__dirname+"/tools_db");
var config = require(__dirname+"/../config");
var lang = require(__dirname+"/../language");

var generateGenericJade = function(jadefile,app,script,param,callback_ok,callback_err){
	tools_db.manyOrNone(script,param,function(items){
		app.render(jadefile, {items: items,param: param}, function(err, html) {
			if(err){
				callback_err(err);
				return;
			}
			callback_ok(html);
		});
	},function(err){
		callback_err(err);
	});
};

module.exports.genProgressBar1 = function(app,script,param,callback_ok,callback_err){
	generateGenericJade('gen_progressbar1',app,script,param,callback_ok,callback_err);
};

module.exports.genMost1 = function(app,script,param,callback_ok,callback_err){
	generateGenericJade('gen_most1',app,script,param,callback_ok,callback_err);	
};

module.exports.genMost2 = function(app,script,param,callback_ok,callback_err){
	generateGenericJade('gen_most2',app,script,param,callback_ok,callback_err);	
};

module.exports.genRecent1 = function(app,script,param,callback_ok,callback_err){
	generateGenericJade('gen_recent1',app,script,param,callback_ok,callback_err);	
};

module.exports.param_jade = function(req){
	var cookies = {};
	if(typeof req.cookies!=='undefined'){
		cookies = req.cookies;
	}else{
		cookies = tools_all.getCookies(req);
	}
	var token = {};
	if(cookies!==""&&cookies!=="{}" && typeof cookies !=="undefined" && typeof cookies.token_access!=="undefined") {
		token = tools_api.RSA.decrypt(cookies.token_access);
		token.role_code = config.dynamic.role[token.role];
	}

	var missing_path = "";
	var protocol = req.protocol;
	var host = req.get('host');
	if(typeof req.get("missing_path") !=="undefined"){
		missing_path = req.get("missing_path");
	}
	if(typeof req.get("missing_host") !=="undefined"){
		host = req.get("missing_host");
	}
	if(typeof req.get("missing_protocol") !=="undefined"){
		protocol = req.get("missing_protocol");
	}
	return {
		applicationFirst: config.app.name1,
		applicationSecond: config.app.name2,
		host: host+missing_path,
		protocol: protocol,
		url: req.originalUrl,
		getFullPath:function(){
			return this.protocol+"://"+host+missing_path;
		},
		cookies: cookies,
		token: token,
		project:config.app.code,
		constant:config.dynamic
	};
};

module.exports.select2Support = function(req,res,sql_statement,sql_params,search_sqls,sql_order){
	console.log('SELECT2SUPPORT');
	var param = req.query;
	if(typeof param.q==='undefined') {
		tools_api.ok200(res,[]);
		return;
	}
	console.log('0');
	param.q = tools_all.filterSearch(param.q);
	if(typeof search_sqls !== 'undefined'){
		var array_search_sqls = [];
		search_sqls.forEach(function(item){
			array_search_sqls.push("to_tsvector('simple',"+item+")@@to_tsquery('simple',${q})");
		});
		sql_statement += ' WHERE '+array_search_sqls.join(' OR ');
	}
	console.log('A');
	if(typeof sql_order !== 'undefined'){
		sql_statement += ' ORDER BY '+sql_order;
	}
	if(typeof sql_params === 'undefined') sql_params = {};
	sql_params.q = param.q;
	sql_statement = 'SELECT raw.id,raw.text FROM ('+sql_statement+') raw';
	console.log('B');
	tools_db.manyOrNone(sql_statement,sql_params,function(data){
		tools_api.ok200(res,data);
	},function(err){
		tools_api.error422(req,res,lang.generic.a);
	});
};

module.exports.tableSupport = function(req,res,sql_statement,search_sqls,sql_order,callback_push,callback_other){
	console.log("Calling Table support");
	var total = 0;
	var draw = req.query.draw; //Halaman berapa, dimulai dari angka 1
	var start = req.query.start; //Berapa QTY per halaman
	var length = req.query.length; //Berapa QTY per halaman
	var search = req.query.searchString;
	var search_string = "";
	console.log("Calling Table support 1;"+search_sqls.length+";"+search);
	search_string = "WHERE lower(CONCAT("+search_sqls.join(",' ',")+")) LIKE '%"+search.toLowerCase()+"%'\n";
	console.log("Calling Table support 2");
	tools_db.manyOrNone("\n\
		SELECT\n\
		row_number() OVER() AS no, raw.*\n\
		FROM\n\
		(\n\
			SELECT COUNT(*) OVER() AS full_count, raw.*\n\
			FROM ("+sql_statement+"\n\
			"+search_string+"\n\
			ORDER BY "+sql_order+") raw\n\
		) raw\n\
		LIMIT "+length+" OFFSET "+start,undefined,function(data){
			var print = [];		
			data.forEach(function(row){
				total = row.full_count;
				print.push(callback_push(row));
			});
			var tr = {
				"draw": draw,
				"recordsTotal": total,
				"recordsFiltered": total,
				"data": print
			};
			if(typeof callback_other !=='undefined') tr.other = callback_other();
			tools_api.ok200(res,tr);
	},function(err){
		tools_api.error422(req,res,lang.cms_table.a);
	});
};