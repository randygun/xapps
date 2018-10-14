module.exports = this;
var instance = this;
var tools_api = require(__dirname+"/../tools/tools_api");
var tools_db = require(__dirname+"/../tools/tools_db");
var tools_all = require(__dirname+"/../tools/tools_all");
var tools_email = require(__dirname+"/../tools/tools_email");
var config = require(__dirname+"/../config");
var lang = require(__dirname+"/../language");
var proc_printing = require(__dirname+"/proc_printing");

this.query = function(req,res,param){
	var watermark = "";
	tools_db.one('SELECT trolley_confirm.*,to_char(trolley_confirm.time_create,\'DD/MM/YYYY HH24:MI:SS\') AS time_create,customer.name,customer.phone, paid.id AS is_paid FROM table_trolley_confirm trolley_confirm LEFT JOIN table_trolley_confirm_agree agree ON agree.id_confirm=trolley_confirm.id LEFT JOIN table_trolley_paid paid ON paid.id_agree=agree.id LEFT JOIN table_user customer ON customer.id=trolley_confirm.id_customer WHERE trolley_confirm.id=${id_trolley_confirm}',param,function(trolley_confirm){
		param.id_destination = trolley_confirm.id_destination;
		if(trolley_confirm.is_delete_reject_buyer || trolley_confirm.is_delete_reject_seller || trolley_confirm.is_delete){
			watermark = "DITOLAK";
		}else if(trolley_confirm.is_paid){
			watermark = "LUNAS";
		}
		tools_db.one('SELECT store.*,ST_X(location.geom_location::geometry) AS location_longitude,ST_Y(location.geom_location::geometry) AS location_latitude FROM table_store store LEFT JOIN table_location_gps location ON location.id=store.id_location WHERE store.id=${id_store}',param,function(store){
			tools_db.one('SELECT *,ST_X(geom_location::geometry) AS location_longitude,ST_Y(geom_location::geometry) AS location_latitude FROM table_location_gps WHERE id=${id_destination}',param,function(destination){
				tools_db.many('SELECT product.*,tcd.qty,tcd.qty AS trolley_qty FROM table_trolley_confirm_detail tcd LEFT JOIN table_product product ON product.id=tcd.id_product WHERE tcd.id_trolley_confirm=${id_trolley_confirm}',param,function(products){
					console.log('CHECKPOINT 1');
					proc_printing.pdfSO(param.id_trolley_confirm,watermark,function(){
						tools_api.ok200(res,{
							trolley_confirm:trolley_confirm,
							store:store,
							products:products,
							destination:destination,
							customer:{
								name: trolley_confirm.name,
								phone: trolley_confirm.phone
							}
						});
					});
				},function(err){
					tools_api.error422(req,res,lang.trolleyconfirm.d);
				});
			},function(err){
				tools_api.error422(req,res,lang.trolleyconfirm.d);
			});
		},function(err){
			tools_api.error422(req,res,lang.trolleyconfirm.d);
		});
	},function(err){
		tools_api.error422(req,res,lang.trolleyconfirm.d);
	});
};