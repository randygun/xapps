var all_cms = require(__dirname+"/all_cms");
var all_api = require(__dirname+"/all_api");

module.exports.register = function(app){
	console.log("REGISTERING ALL");
	// app.use('/',require(__dirname+'/all_cms'));
	app.use('/api',all_api);
	app.use('/',all_cms);
};