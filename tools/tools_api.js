var config = require(__dirname+'/../config');
var lang = require(__dirname+'/../language');
var tools_db = require(__dirname+'/tools_db');
var tools_all = require(__dirname+'/tools_all');
var tools_cms = require(__dirname+'/tools_cms');
var formidable = require('formidable');
var fs = require('fs');
var path = require('path');
var validator = require('validator');

var instance = this;


module.exports.error422 = function(req,res,errors){
	console.log("RESULT 422: "+JSON.stringify(errors));
	var language = '';
	if(typeof req.token_access !== 'undefined' && typeof req.token_access.lang !== 'undefined' && req.token_access.lang !== null) language = config.dynamic.language[""+req.token_access.lang];
	else language = config.setting.language;
	console.log('config.setting.print: '+JSON.stringify(config.setting));
	console.log('LANGUAGE '+language+";"+config.setting.language+";");
	if(!res.headerSent)	res.status(422).json({error:{messages:errors[language],raw_messages:errors}});
}

module.exports.error403 = function(res){
	console.log("RESULT 403.");
	if(!res.headerSent) res.status(403).json({});
}

module.exports.error401 = function(res){
	console.log("RESULT 401.");
	if(!res.headerSent) res.status(401).json({});
}

module.exports.error404 = function(res){
	console.log("RESULT 404.");
	if(!res.headerSent) res.status(404).json({});
}

module.exports.redirectTemporary = function(res,url,req){
	console.log("RESULT 302 "+url);
	res.writeHead(302, {
	  'Location': (tools_cms.param_jade(req).getFullPath()+url)
	  //add other headers here...
	});
	if(!res.headerSent) res.end();
}

module.exports.ok200 = function(res,data){
	console.log("RESULT 200: "+JSON.stringify(data));
	console.log('config.setting.print: '+JSON.stringify(config.setting));
	if(!res.headerSent) res.json(data);
}
module.exports.success200 = function(res){
	this.ok200(res,{success:true});
}
module.exports.fail200 = function(res){
	this.ok200(res,{success:false});
}
module.exports.incompleteParameter = function(req,res){
	var body = req.body;
	var query = req.query;
	console.log("BODY:"+JSON.stringify(body));
	console.log("QUERY:"+JSON.stringify(query));
	this.error422(req,res,lang.api_tools.a);
}


module.exports.RSA = {
	encrypt:function(dataObj){
		return config.RSA.key.encrypt(JSON.stringify(dataObj), 'base64');
	},decrypt:function(dataString){
		return JSON.parse(config.RSA.key.decrypt(dataString, 'utf8'));
	}
};

var newTokenTime = function(req){
	//ONE HOUR
	console.log('Will calculate tokentime');
	console.log("CREATE TOKEN "+req.TAG_START+";"+config.setting.token_access_expire);
	return (req.TAG_START + parseInt(config.setting.token_access_expire));
}

module.exports.genTokenSession = function(user){
	return instance.RSA.encrypt({
		id:user.id,
		num:1
	});
}
module.exports.genTokenAccess = function(user,req){
	console.log('Create token_access');
	return instance.RSA.encrypt({
		id:parseInt(user.id),
		role:parseInt(user.id_role),
		exp:newTokenTime(req),
		lang:parseInt(user.id_language)
	});
}
module.exports.genTokenRenew = function(req){	
	return {
		token_access:instance.RSA.encrypt({
			id:req.token_access.id,
			role:req.token_access.role,
			exp:newTokenTime(req),
			lang:req.token_access.lang
		}),token_session:instance.RSA.encrypt({
			id:req.token_session.id,
			num:(req.token_session.num+1)
		})
	};
}
module.exports.genTokenAccessUpdateLang = function(req,id_language){	
	return instance.RSA.encrypt({
			id:req.token_access.id,
			role:req.token_access.role,
			exp:req.token_access.exp,
			lang:id_language
		});
}

module.exports.paginationSupport = function(req,res,sql_statement,what,callback_check,array_search,special_variable,special_count){
	var param = req.query;
	var special_page_max = parseInt(config.setting.page_pagination);
	var special_waiting = false;
	var special_page_go = param.page_go;
	if(typeof special_variable !== 'undefined'){
		if(typeof special_variable.page_max !== 'undefined'){
			special_page_max = special_variable.page_max;
		}
		if(typeof special_variable.waiting !== 'undefined'){
			special_waiting = special_variable.waiting;
		}
		if(typeof special_variable.page_go !== 'undefined'){
			special_page_go = special_variable.page_go;
		}
	}
	var page_go = "#";
	var whereStatement = "";
	if(typeof special_page_go!=="undefined" && special_page_go==="#"){
		instance.error422(req,res,lang.api_tools.b);
		return;
	}
	if(typeof special_page_go==="undefined" || special_page_go==="") special_page_go = 0;
	if(typeof array_search !== "undefined" && array_search.length >0 && typeof param.search !== 'undefined' && param.search !== '' ){
		param.search = tools_all.filterSearch(param.search);
		var items = [];
		array_search.forEach(function(item){
			items.push('coalesce(raw.'+item+",'')");
		});
		whereStatement = whereStatement+" AND to_tsvector('simple', "+items.join("||' '||")+")@@to_tsquery('simple',${search}) ";
	}
	if(typeof param.filter !== "undefined" && param.filter!==""){
		//EXPECTED VALUE [{"key":"id_location","value":"1"},{"key":"id_id","value":"1"}]
		try{
			var array_filter = JSON.parse(param.filter);
			var items = [];
			array_filter.forEach(function(item){
				items.push('raw.'+item.key+"='"+item.value+"'");
			});
			if(items.length>0) whereStatement = whereStatement+' AND '+items.join(' AND ');
		}catch(err){

		}
	}
	param.page_go = parseInt(special_page_go);
	param.page_max = special_page_max;
	var page_max_string = "LIMIT ${page_max} OFFSET 0";
	if(param.page_max === null) page_max_string = "";
	param.id_user = req.token_access.id;
	var special_count_string = "";
	if(typeof special_count !== 'undefined'){
		special_count_string = "COUNT("+special_count+") OVER() AS special_count,";
	}
	tools_db.manyOrNone("\n\
		SELECT raw.*, MAX(raw.no) OVER() AS maxno\n\
		FROM \n\
		(\n\
			SELECT row_number() OVER() AS no, count(*) OVER() AS total,"+special_count_string+" raw.*\n\
			FROM ("+sql_statement+") raw\n\
		) raw \n\
		WHERE raw.no > ${page_go} "+whereStatement+" \n\
		"+page_max_string,param,function(data){
			console.log("PAGINATION DATA: "+JSON.stringify(data));
			var print = [];
			var page_go = "#";
			var whatPrint = {};
			if(data.length>0 && (parseInt(data[data.length-1].no)!==parseInt(data[0].maxno))){
				page_go = data[data.length - 1].no;
			}
			if(data.length>0 && typeof special_count !== 'undefined'){
				whatPrint.special_count = data[0].special_count;
			}
			data.forEach(function(row){
				delete row.maxno;
				delete row.no;
				delete row.total;
				delete row.special_count;
				print.push(row);
			});
			whatPrint[what] = print;
			whatPrint.pagination = {page_go:page_go};
			if(special_waiting){
				callback_check(whatPrint);
			}else if(typeof callback_check === "undefined"){
				instance.ok200(res,whatPrint);
			}else{
				instance.ok200(res,callback_check(whatPrint));
			}
	},function(err){
		instance.error422(req,res,lang.api_tools.c);
	});
};

var importFileGetName = function(original_name){
	var now = new Date();
	var time = now.getTime();
	var random = Math.ceil(Math.random()*1000000);
	var astring = original_name.split(".");
	return ""+time+""+random+"."+astring[astring.length-1];
};

module.exports.uploadFile = function(req,res,param){
	var folder = 'uploads';
	var result = {};
	if(typeof param.folder!=='undefined' && param.folder!=='') folder = param.folder;
	var form = new formidable.IncomingForm();
	form.multiples = true;
	form.uploadDir = path.join(__dirname, '../public/'+folder);
	form.on('file', function(field, file) {
		var newFile = importFileGetName(file.name);
		console.log("FILE START "+field+";"+newFile);
		if(typeof result[field] === 'undefined') result[field] = [];
		result[field].push(tools_cms.param_jade(req).getFullPath()+"/"+folder+"/"+newFile);
		fs.rename(file.path, path.join(form.uploadDir, newFile));
		console.log("FILE COMPLETE "+field+";"+newFile);
	});
	form.on('field', function(field, value) {
		//IGNORING FIELD. DONT CARE
		console.log("FIELD");
	});
	form.on('error', function(err) {
		console.log("ERROR");
	    console.log('An error has occured: \n' + err);
	    instance.error422(req,res,lang.api_tools.e);
	});
	form.on('end',function(){
		console.log("END");
		instance.ok200(res,{uploaded:result});
	});
	form.parse(req);
};

module.exports.exportFile = function(res,sql_statement,file_name){
	var date = new Date();
	var complete_file_name = file_name+date.yyyymmdd()+instance.genRandom(4)+'.csv';
	tools_db.none("COPY ("+sql_statement+") TO '"+__dirname+"/../public/"+complete_file_name+"' DELIMITER ',' CSV HEADER",undefined,function(){
		instance.ok200(res,{file:complete_file_name});
	},function(err){
		instance.error422(req,res,lang.api_tools.d);
	});
};

