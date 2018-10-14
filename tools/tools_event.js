module.exports = this;

var instance = this;

this.setSetting = function(callback){
	instance.setting = callback;
};

this.finishSetting = function(){
	if(typeof instance.setting !== "undefined") instance.setting();
};