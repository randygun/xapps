var request = require('request');
var config = require(__dirname+"/../config");

var queue = [];
var failed = [];

module.exports.add = function(to,raw,title,text){
	var param = {to:to,raw:raw,title:title,text:text};
	console.log('#FCM ADD '+JSON.stringify(param));
	queue.push(param);
};

var run = function(notification){
	if(typeof notification==='undefined'){
		console.log('#FCMEMPTY');
		queue = queue.concat(failed);
		failed = [];
		waiting();
		return;
	}
	var options = {
		uri: 'https://fcm.googleapis.com/fcm/send',
		method: 'POST',
		headers: {
		    'Content-Type': 'application/json',
		    'Authorization':'key='+config.setting.key_pushnotifgcm
		},
		json: {
			data:{
				raw:notification.raw
			},
			to:notification.to,
			notification:{
				title:notification.title,
				text:notification.text,
				sound:'default'
			}
		}
	};
	console.log("#FCMRUN "+JSON.stringify(options));
	request(options, function (error, response, body) {
		if(error){
			failed.push(notification);
			console.log('#FCMFAILED');
		}
		console.log('#FCMRESPONSE: '+JSON.stringify(body));
		queue.shift();
		run(queue[0]);
	});
};

var waiting = function(){
	console.log('#FCMWAITINGSESSION');
	setTimeout(function(){
		run(queue[0]);
	},15000);
};

waiting();

