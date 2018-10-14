var XLSX = require('xlsx');
var tools_db = require(__dirname+"/tools_db");

function Workbook() {
	if(!(this instanceof Workbook)) return new Workbook();
	this.SheetNames = [];
	this.Sheets = {};
}

function sheet_from_array_of_arrays(data, opts) {
	var ws = {};
	var range = {s: {c:10000000, r:10000000}, e: {c:0, r:0 }};
	for(var R = 0; R != data.length; ++R) {
		for(var C = 0; C != data[R].length; ++C) {
			if(range.s.r > R) range.s.r = R;
			if(range.s.c > C) range.s.c = C;
			if(range.e.r < R) range.e.r = R;
			if(range.e.c < C) range.e.c = C;
			var cell = {v: data[R][C] };
			if(cell.v == null) continue;
			var cell_ref = XLSX.utils.encode_cell({c:C,r:R});
			
			if(typeof cell.v === 'number') cell.t = 'n';
			else if(typeof cell.v === 'boolean') cell.t = 'b';
			else if(cell.v instanceof Date) {
				cell.t = 'n'; cell.z = XLSX.SSF._table[14];
				cell.v = datenum(cell.v);
			}
			else cell.t = 's';
			
			ws[cell_ref] = cell;
		}
	}
	if(range.s.c < 10000000) ws['!ref'] = XLSX.utils.encode_range(range);
	return ws;
}

function sheet_from_object_of_arrays(data, opts) {
	var ws = {};
	var range = {s: {c:10000000, r:10000000}, e: {c:0, r:0 }};
	var wide = 0;
	var height = data.length+1;
	if(data.length>0) {
		wide = Object.keys(data[0]).length;
		var row = data[0];
		for(var C = 0; C != wide; ++C) {			
			var cell = {v: Object.keys(row)[C] ,t:'s'};
			var cell_ref = XLSX.utils.encode_cell({c:C,r:0});
			console.log('KEY '+cell_ref+";"+Object.keys(row)[C]);
			ws[cell_ref] = cell;
		};
	}
	for(var R = 1; R != height; ++R) {
		for(var C = 0; C != wide; ++C) {
			if(range.s.r > R) range.s.r = 0;
			if(range.s.c > C) range.s.c = 0;
			if(range.e.r < R) range.e.r = R;
			if(range.e.c < C) range.e.c = C;
			var row = data[R-1];
			var cell = {v: row[Object.keys(row)[C]] };
			if(cell.v == null) continue;
			var cell_ref = XLSX.utils.encode_cell({c:C,r:R});
			
			if(typeof cell.v === 'number') cell.t = 'n';
			else if(typeof cell.v === 'boolean') cell.t = 'b';
			else if(cell.v instanceof Date) {
				cell.t = 'n'; cell.z = XLSX.SSF._table[14];
				cell.v = datenum(cell.v);
			}
			else cell.t = 's';
			
			ws[cell_ref] = cell;
		}
	}
	if(range.s.c < 10000000) ws['!ref'] = XLSX.utils.encode_range(range);
	// console.log('BROOO '+JSON.stringify(ws)+";"+JSON.stringify(range));
	return ws;
}

module.exports.exportFromDB = function(script,param,sheetName,callback_done,callback_err){
	tools_db.manyOrNone(script,param,function(datas){
		var ws_name = sheetName;
		var wb = new Workbook();
		wb.SheetNames.push(ws_name);
		wb.Sheets[ws_name] = sheet_from_object_of_arrays(datas);
		var file = "/report/"+sheetName+(new Date()).getTime()+".xlsx";
		pathwrite = __dirname+"/../public"+file;
		XLSX.writeFile(wb, pathwrite);
		callback_done(file);
	},function(err){
		callback_err(err);
	});
};
