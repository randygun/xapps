var config = require(__dirname+"/../config");
var instance = this;

Number.prototype.formatMoney = function(c, d, t){  
var n = this, 
    c = isNaN(c = Math.abs(c)) ? 2 : c, 
    d = d == undefined ? "," : d, 
    t = t == undefined ? "." : t, 
    s = n < 0 ? "-" : "", 
    i = parseInt(n = Math.abs(+n || 0).toFixed(c)) + "", 
    j = (j = i.length) > 3 ? j % 3 : 0;
   return s + (j ? i.substr(0, j) + t : "") + i.substr(j).replace(/(\d{3})(?=\d)/g, "$1" + t) + (c ? d + Math.abs(n - i).toFixed(c).slice(2) : "");
};

Date.prototype.yyyymmddhhmiss = function() {
  var mm = this.getMonth() + 1; // getMonth() is zero-based
  var dd = this.getDate();
  var hh = this.getHour();
  var mi = this.getMinute();
  var ss = this.getSecond();

  return [this.getFullYear(), !mm[1] && '0', mm, !dd[1] && '0', dd, !hh[1] && '0', hh, !mi[1] && '0', mi, !ss[1] && '0', ss].join(''); // padding
};

Date.prototype.yyyymmddhhmisssimple = function() {
  var mm = this.getMonth() + 1; // getMonth() is zero-based
  var dd = this.getDate();
  var hh = this.getHour();
  var mi = this.getMinute();
  var ss = this.getSecond();

  return [this.getFullYear(), !mm[1] && '0', mm, !dd[1] && '0', dd].join('-')+" "+[!hh[1] && '0', hh, !mi[1] && '0', mi, !ss[1] && '0', ss].join(':'); // padding
};

var getMonthString = function(mm){
  switch(mm){
    case 1: return "Jan";
    case 2: return "Feb";
    case 3: return "Mar";
    case 4: return "Apr";
    case 5: return "May";
    case 6: return "Jun";
    case 7: return "Jul";
    case 8: return "Aug";
    case 9: return "Sep";
    case 10: return "Oct";
    case 11: return "Nov";
    case 12: return "Dec";
  }
}

Date.prototype.yyyymmddstring = function() {
  var mm = this.getMonth() + 1; // getMonth() is zero-based
  var dd = ""+this.getDate();
  var mms = getMonthString(mm);
  return [!dd[1]?'0'+ dd:dd,mms,this.getFullYear()].join(' '); // padding
};

Date.prototype.yyyymmdd = function() {
  var mm = this.getMonth() + 1; // getMonth() is zero-based
  var dd = this.getDate();

  return [this.getFullYear(),
          (mm>9 ? '' : '0') + mm,
          (dd>9 ? '' : '0') + dd
         ].join('-');
};

module.exports.md5 = require('md5');

module.exports.saveCookies = function(res,data){
  console.log('SAVE COOKIES '+JSON.stringify(data));
	res.cookie(config.app.code,JSON.stringify(data), { maxAge: 999999999});
};

module.exports.getCookies = function(req){
  console.log("READ COOKIES CAK "+JSON.stringify(req.cookies));
  if(typeof req.cookies!=='undefined'&&typeof req.cookies[config.app.code] !=="undefined"){
    console.log("READ COOKIES CAK A");
    return JSON.parse(req.cookies[config.app.code]);
  }
  if(typeof req.cookies!=='undefined'&&typeof req.cookies.token_access!=='undefined'){
    console.log("READ COOKIES CAK B");
    return req.cookies;
  }
  console.log("READ COOKIES CAK C");
  return undefined;
	// if(typeof req.cookies==="undefined"||typeof req.cookies[config.app.code] ==="undefined"){
	// 	console.log("NO COOKIES");
	// 	return undefined;
	// }
 //  console.log("READ COOKIES BROOOOO "+req.cookies[config.app.code]);
	// return JSON.parse(req.cookies[config.app.code]);
};

module.exports.isNumeric = function(n){
  return !isNaN(parseFloat(n)) && isFinite(n);
}

module.exports.randomString = function(length, chars) {
    var result = '';
    for (var i = length; i > 0; --i) result += chars[Math.floor(Math.random() * chars.length)];
    return result;
}

module.exports.filterSearch = function(search){
  return search.replace(/ /g,'|').replace(/\|+/g, '|').replace(/\|$/g, '');
}


module.exports.genRandom = function(digits){
	return instance.randomString(digits,'0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ');
};