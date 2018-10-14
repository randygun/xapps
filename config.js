module.exports = this;

var instance = this;

this.savedInstance = {
	api:0
};

this.db = {
	username:"databasemasterutama",
	password:"P4$$wrd$u$4H",
	server:'128.199.78.44',
	db:'appku_xapps'
}

this.app = {
	name1: 'Tunjuk',
	name2: 'Material',
	code: 'xapps',
	complete: 'Tunjuk Material',
	port: 3009
}

// this.email = {
// 	from: 'admin@tunjukmaterial.com',
// 	host: 'smtp.gmail.com',
// 	username: 'tm.developer.team@gmail.com',
// 	password: 'tm.team.gmail'
// }
this.email = {
	from: 'admin@tunjukmaterial.com',
	host: 'mail.tunjukmaterial.com',
	username: 'admin@tunjukmaterial.com',
	password: 'tm270717'
}

this.RSA = {
	key: null
}

this.path = {
	free:{
		'/salesorder':'GET',//CMS
		'/mutasi':'GET',//CMS
		'/login':'GET,POST',//CMS
		'/logout':'GET',//CMS
		'/forgetpassword':'GET,POST',//CMS
		'/version':'GET',
		'/user/login':'POST',
		'/user/register':'POST',
		'/user/register/dummy':'POST',
		'/user/register/seller':'POST',
		'/user/socmed':'POST',
		'/user/forget':'POST',
		'/external/veritrans/release/installment/bni//charge':'POST',
		'/external/veritrans/release/installment/mandiri//charge':'POST',
		'/external/veritrans/release/installment/bca//charge':'POST',
		'/external/veritrans/release/installment/cimb//charge':'POST',
		'/external/veritrans/release/installment/offline//charge':'POST',
		'/external/veritrans/release/installment/bri//charge':'POST',
		'/external/veritrans/release/installment/maybank//charge':'POST',
		'/external/veritrans/release/creditcard/charge':'POST',
		'/external/veritrans/release/banktransfer/charge':'POST',
		'/external/veritrans/release/charge':'POST',
		'/external/veritrans/debug/installment/bni//charge':'POST',
		'/external/veritrans/debug/installment/mandiri//charge':'POST',
		'/external/veritrans/debug/installment/bca//charge':'POST',
		'/external/veritrans/debug/installment/cimb//charge':'POST',
		'/external/veritrans/debug/installment/offline//charge':'POST',
		'/external/veritrans/debug/installment/bri//charge':'POST',
		'/external/veritrans/debug/installment/maybank//charge':'POST',
		'/external/veritrans/debug/creditcard/charge':'POST',
		'/external/veritrans/debug/banktransfer/charge':'POST',
		'/external/veritrans/debug/charge':'POST',
		'/external/veritrans':'GET,POST'
	},lifetime:{
		'/token/renew':'POST'
	}
}

this.setting = {
	token_access_expire:3600000,
	language:'en'
}

this.setCluster = function(cluster){
	if(typeof instance.cluster==="undefined") {console.log("Cluster blank"); instance.cluster = cluster;}
	else { console.log("Cluster exist "+instance.cluster.worker.id); instance.cluster = cluster;}
}

this.setDynamic = function(dynamic){
	instance.dynamic = dynamic;
}
