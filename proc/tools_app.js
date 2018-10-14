var config = require(__dirname+"/../config");
this.getFeeDelivery = function(distance){
	var price = 0;
	var array_fee_delivery = config.setting.fee_delivery;
	array_fee_delivery.forEach(function(row){
		console.log("ROW.DISTANCE:"+row.distance+";"+distance);
		if(parseInt(row.distance)<parseInt(distance) && price===0) {
			console.log("ROW.DISTANCECONFIRM:"+row.distance+";"+distance);
			price = row.price;
			return;
		}
	});
	return price;
};
module.exports = this;