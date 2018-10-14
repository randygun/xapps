var express = require('express');
var router = express.Router();
var tools_cms = require(__dirname+'/../tools/tools_cms');
var tools_db = require(__dirname+'/../tools/tools_db');
var tools_email = require(__dirname+'/../tools/tools_email');
var config = require(__dirname+'/../config');
var request = require('request');
var proc_printing = require(__dirname+'/../proc/proc_printing');

/* GET home page. */
router.post('/', function(req, res, next) {
	//VERITRANS req.ip: ::ffff:103.44.27.3;::ffff:103.44.27.3;{"masked_card":"401111-1112","approval_code":"1481497756414","bank":"bni","transaction_time":"2016-12-12 06:09:16","gross_amount":"500000.00","order_id":"TOPUP/8/12/12/2016","payment_type":"credit_card","signature_key":"279299e3d2f6d8138708683e5d4495aae52bbc874e03ac4355f3e692f5a473bda0756478f6f699790214b61f0e778a322473a68484ffe33bc5658b08e7716557","status_code":"200","transaction_id":"9bc52610-ba59-444a-8df7-892627e370e9","transaction_status":"capture","fraud_status":"accept","status_message":"Veritrans payment notification"};{"user-agent":"Veritrans","content-type":"application/json","content-length":"531","host":"appku.id:3009"}
	var param_jade = tools_cms.param_jade(req);
	var IPADDR = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
	tools_db.none('INSERT INTO veritrans_record (ip_address,input_body,input_header) VALUES (${ip_address},${body},${header})',{ip_address:IPADDR,body:req.body,header:req.headers},function(){},function(err){});
	console.log('VERITRANS req.ip: '+req.ip+";"+IPADDR+";"+JSON.stringify(req.body)+";"+JSON.stringify(req.headers));
	res.render('cms_external_veritrans', { param_jade: param_jade});
	var order_array = req.body.order_id.split('/');
	if(
		(parseInt(req.body.status_code)===200&&req.body.fraud_status==="accept"&&req.body.payment_type==='credit_card'&&req.body.transaction_status==="capture") ||
		(parseInt(req.body.status_code)===201&&req.body.fraud_status==="accept"&&req.body.payment_type==='bank_transfer'&&req.body.transaction_status==="settlement") || 
		(parseInt(req.body.status_code)===202&&req.body.fraud_status==="accept"&&req.body.payment_type==='bank_transfer'&&req.body.transaction_status==="expire")
	){
		//DO NOTHING
	}else{
		return;
	}
	if(req.body.transaction_status==="expire"){
		if(order_array[0]==='TOPUP'){
			var param = {
				generated_number:req.body.order_id,
				vt_header:req.headers,
				vt_body:req.body
			};
			tools_db.one('UPDATE table_topup SET is_success=FALSE,is_complete=TRUE,time_complete=NOW(),vt_header=${vt_header},vt_body=${vt_body} WHERE generated_number=${generated_number} AND is_complete=FALSE RETURNING id_user,id',param,function(topup){
			
			},function(err){

			});
		}else if(order_array[0]==="SO"){

		}
		return;
	}
	if(order_array[0]==='TOPUP'){
		//TOPUP
		var param = {
			generated_number:req.body.order_id,
			vt_header:req.headers,
			vt_body:req.body
		};
		tools_db.one('UPDATE table_topup SET is_success=TRUE,is_complete=TRUE,time_success=NOW(),time_complete=NOW(),vt_header=${vt_header},vt_body=${vt_body} WHERE generated_number=${generated_number} AND is_complete=FALSE RETURNING id_user,id,generated_number',param,function(topup){
			var param = {id_user:topup.id_user,topup:parseInt(req.body.gross_amount),id_order:topup.id};
			tools_db.one('UPDATE table_user SET saldo=saldo+${topup} WHERE id=${id_user} RETURNING id,saldo',param,function(user){
				var amount = parseInt(param.topup);
				var balance_current = parseInt(user.saldo)-parseInt(param.topup);
				var balance_after = parseInt(user.saldo);
				var parambalancehistory = {
					remark_id:'Tambah Saldo',
					remark_en:'Top Up',
					remark_zh:'Top Up',
					id_user:user.id,
					is_plus:true,
					amount:amount,
					balance_current:balance_current,
					balance_after:balance_after,
					order:topup.generated_number
				};
				tools_db.none('INSERT INTO table_balance_history (remark_id,remark_en,remark_zh,id_user,is_plus,amount,balance_current,balance_after,order_number) VALUES (${remark_id},${remark_en},${remark_zh},${id_user},${is_plus},${amount},${balance_current},${balance_after},${order})',parambalancehistory,function(){},function(err){});
				//NOTIFICATION
				tools_db.one('SELECT dev.token_fcm,usr.id_language,usr.id FROM table_user usr LEFT JOIN table_device dev ON dev.id=usr.id_device WHERE usr.id=${id_user}',param,function(user){
					param.token_fcm = user.token_fcm;
					if(param.token_fcm === null) param.token_fcm = "";
					var title = "Topup Success";
					var message = "Topup confirmed. Your balance added Rp. "+parseInt(param.topup).formatMoney(0);
					var job = "order_topup";
					var sent = {title:title,message:message,job:job,id:param.id_order};
					if(config.dynamic.language[user.id_language] === 'id'){
						//INDONESIA
						sent.title = "Topup Sukses";
						sent.message = "Topup terkonfirmasi. Saldo anda bertambah Rp. "+parseInt(param.topup).formatMoney(0);
					}
					param.sent = JSON.stringify(sent);
					tools_db.none('INSERT INTO table_notification (id_user,device_token,sent) VALUES (${id_user},${token_fcm},${sent})',param,function(){},function(err){});
				},function(err){
				});
			},function(err){});
		},function(err){

		});
	}else if(order_array[0]==="SO"){
		tools_db.one('SELECT SUM(tp.price*tcad.qty) AS summed,tc.id FROM (SELECT * FROM table_order WHERE generated_number=$1 ORDER BY id DESC LIMIT 1) tor LEFT JOIN table_trolley_confirm tc ON tc.id=tor.id_order LEFT JOIN table_trolley_confirm_detail tcd ON tcd.id_trolley_confirm=tc.id LEFT JOIN table_product tp ON tp.id=tcd.id_product LEFT JOIN table_trolley_confirm_agree_detail tcad ON tcad.id_confirm_detail=tcd.id WHERE tcad.id IS NOT NULL AND tp.id IS NOT NULL AND tor.generated_number=$1 GROUP BY tc.id',req.body.order_id,function(order){
			if(parseInt(order.summed)>parseInt(req.body.gross_amount)){
				return;
			}
			var param = {id_order:order.id};
			param.installment_term = null;
			if(typeof req.body.installment_term !== 'undefined') param.installment_term = req.body.installment_term;
			param.payment_type = req.body.payment_type;
			tools_db.one('UPDATE table_trolley_confirm_agree SET is_paid=TRUE, payment_type=${payment_type}, installment_term=${installment_term} WHERE id_confirm=${id_order} RETURNING id',param,function(agree){
				//CONFIRM UDAH DIBAYAR
				param.role_seller = config.dynamic.role.seller;
				proc_printing.pdfSO(param.id_order,'LUNAS',function(){
					tools_db.one('SELECT usr.username,usr.name FROM table_trolley_confirm tc LEFT JOIN (SELECT * FROM table_user WHERE id_role=${role_seller}) usr ON usr.id_store=tc.id_store WHERE tc.id=${id_order}',param,function(seller){
						tools_email.logSend(req.app,[seller.username],'Pesanan Lunas','template_email_order_paid_seller','order_paid_seller',{
							attachments:[
					          {
					            fileName:'tunjukmaterial.png',
					            filePath: __dirname+"/../public/images/tm_green.png",
					            cid: 'tmpicture'
					          },
					          {
					            fileName:'SalesOrder.pdf',
					            filePath: __dirname+"/../public/salesorder/SalesOrder"+param.id_order+".pdf"
					          }
					        ],
					        name: seller.name,
					        support:{
					          phone: config.setting.support_phone,
					          email: config.setting.support_email,
					          operationaltime: config.setting.support_operationaltime
					        }
						});										
					},function(err){});
					tools_db.one('SELECT usr.username,usr.name FROM table_trolley_confirm tc LEFT JOIN table_user usr ON usr.id=tc.id_customer WHERE tc.id=${id_order}',param,function(buyer){
						tools_email.logSend(req.app,[buyer.username],'Pesanan Lunas','template_email_order_paid_buyer','order_paid_buyer',{
							attachments:[
					          {
					            fileName:'tunjukmaterial.png',
					            filePath: __dirname+"/../public/images/tm_red.png",
					            cid: 'tmpicture'
					          },
					          {
					            fileName:'SalesOrder.pdf',
					            filePath: __dirname+"/../public/salesorder/SalesOrder"+param.id_order+".pdf"
					          }
					        ],
					        name: buyer.name,
					        support:{
					          phone: config.setting.support_phone,
					          email: config.setting.support_email,
					          operationaltime: config.setting.support_operationaltime
					        }
						});									
					},function(err){});
				});				
				param.id_agree = agree.id;
				if(req.body.payment_type==='credit_card') param.id_type=1;
				else param.id_type=2;
				param.vt_header = req.headers;
				param.vt_body = req.body;
				param.commission = config.setting.commission;
				tools_db.one('INSERT INTO table_trolley_paid (id_agree,id_provider,vt_header,vt_body,commission) VALUES (${id_agree},${id_type},${vt_header},${vt_body},${commission}) RETURNING id',param,function(paid){
					//NOTIFICATION
					tools_db.one('SELECT id_store FROM table_trolley_confirm WHERE id=${id_order}',param,function(confirm){
						param.id_store = confirm.id_store;						
						tools_db.one('SELECT dev.token_fcm,usr.id_language,usr.id FROM table_user usr LEFT JOIN table_device dev ON dev.id=usr.id_device WHERE usr.id_store=${id_store} AND usr.id_role='+config.dynamic.role.seller,param,function(user){
							param.token_fcm = user.token_fcm;
							param.id_seller = user.id;
							if(param.token_fcm === null) param.token_fcm = "";
							var title = "Order Paid";
							var message = "Order paid by user. Please prepare the delivery.";
							var job = "trolley_paid";
							var sent = {title:title,message:message,job:job,id:param.id_order};
							if(config.dynamic.language[user.id_language] === 'id'){
								//INDONESIA
								sent.title = "Order Telah Dibayar";
								sent.message = "Order telah dibayar. Siapkan untuk pengiriman.";
							}
							param.sent = JSON.stringify(sent);
							tools_db.none('INSERT INTO table_notification (id_user,device_token,sent) VALUES (${id_seller},${token_fcm},${sent})',param,function(){},function(err){});
						},function(err){
						});
					},function(err){
					});
				},function(err){
				});
			},function(err){
			});
		},function(err){
		});
	}
});

var recordToken = function(input_header,input_body,result_header,result_body){
	var param = {
		input_header:input_header,
		input_body:input_body,
		result_header:result_header,
		result_body:result_body
	}
	tools_db.none('INSERT INTO veritrans_token (input_header,input_body,result_header,result_body) VALUES (${input_header},${input_body},${result_header},${result_body})',param,function(){},function(err){});
};

router.post('/:env/banktransfer/charge',function(req,res,next){
	console.log('VTCHARGE INIT');
	console.log('VTCHARGE '+JSON.stringify(req.body));
	var headers = {};
	// delete headers.host;
	var SERVER_KEY;
	var url;
	if(req.params.env==="debug"){
		SERVER_KEY = "VT-server-6WLfA9MggCFaXI6Rbk8lmdoi";
		url = 'https://app.sandbox.midtrans.com/snap/v1/transactions';
	}else{
		SERVER_KEY = "VT-server-0S525bemjKot1_BEqPgQUz3p"; //PRODUCTION
		url = 'https://app.midtrans.com/snap/v1/transactions'; //PRODUCTION
	}
	headers['Accept'] = 'application/json';
	headers['Content-Type'] = 'application/json';
	headers['Authorization'] = 'Basic '+new Buffer(SERVER_KEY+':').toString('base64');
	console.log('VT SEND HEADER: '+JSON.stringify(headers));
	request({ method: 'POST', url: url, headers: headers, json:req.body}, function(err, remoteResponse, remoteBody) {
        console.log('VTCHARGE BFERROR');
    	recordToken(req.headers,req.body,remoteResponse.headers,remoteBody);
        if (err) { 
			console.log('VTCHARGE ERROR: '+err);
        	return res.status(500).end('Error');  
        }
        console.log("VTNOERROR");
        console.log("VTHEADER "+JSON.stringify(remoteResponse.headers));
        console.log("VTBODY "+JSON.stringify(remoteBody));
        // res.writeHead(remoteResponse.headers); // copy all headers from remoteResponse
        res.json(remoteBody);
    });
});

router.post('/:env/creditcard/charge',function(req,res,next){
	console.log('VTCHARGE INIT');
	// req.body.credit_card.channel = "migs";
	console.log('VTCHARGE '+JSON.stringify(req.body));
	var headers = {};
	// delete headers.host;
	var SERVER_KEY;
	var url;
	if(req.params.env==="debug"){
		SERVER_KEY = "VT-server-6WLfA9MggCFaXI6Rbk8lmdoi";
		url = 'https://app.sandbox.midtrans.com/snap/v1/transactions';
	}else{
		SERVER_KEY = "VT-server-0S525bemjKot1_BEqPgQUz3p"; //PRODUCTION
		url = 'https://app.midtrans.com/snap/v1/transactions'; //PRODUCTION
	}
	headers['Accept'] = 'application/json';
	headers['Content-Type'] = 'application/json';
	headers['Authorization'] = 'Basic '+new Buffer(SERVER_KEY+':').toString('base64');
	console.log('VT SEND HEADER: '+JSON.stringify(headers));
    delete req.body.credit_card.channel;
	request({ method: 'POST', url: url, headers: headers, json:req.body}, function(err, remoteResponse, remoteBody) {
        console.log('VTCHARGE BFERROR');
    	recordToken(req.headers,req.body,remoteResponse.headers,remoteBody);
        if (err) { 
			console.log('VTCHARGE ERROR: '+err);
        	return res.status(500).end('Error');  
        }
        console.log("VTNOERROR");
        console.log("VTHEADER "+JSON.stringify(remoteResponse.headers));
        console.log("VTBODY "+JSON.stringify(remoteBody));
        // res.writeHead(remoteResponse.headers); // copy all headers from remoteResponse
        res.json(remoteBody);
    });
});

router.post('/:env/installment/:bank/:term/charge',function(req,res,next){
	var params = req.params;
	console.log('VTCHARGE INSTALLMENT INIT');
	console.log('VTCHARGE INSTALLMENT BODY '+JSON.stringify(req.body));
	// req.body.credit_card = {};
	// req.body.credit_card.channel = "migs";
	// req.body.credit_card.bank = params.bank;
	// req.body.credit_card.secure = true;
	// req.body.credit_card.whitelist_bins = ["46170069"];
	req.body.credit_card.installment = {};
	req.body.credit_card.installment.required = true;
	try{
		req.body.credit_card.installment.terms = JSON.parse('{"'+params.bank+'":['+params.term+']}');
	}catch(err){
		req.body.credit_card.installment.terms = {
			bni: [],
			mandiri: [],
			bca: [],
			cimb: [],
			offline: []
		};
	}
	console.log('VTCHARGE INIT');
	console.log('VTCHARGE '+JSON.stringify(req.body));
	var headers = {};
	// delete headers.host;
	var SERVER_KEY;
	var url;
	if(req.params.env==="debug"){
		SERVER_KEY = "VT-server-6WLfA9MggCFaXI6Rbk8lmdoi";
		url = 'https://app.sandbox.midtrans.com/snap/v1/transactions';
	}else{
		SERVER_KEY = "VT-server-0S525bemjKot1_BEqPgQUz3p"; //PRODUCTION
		url = 'https://app.midtrans.com/snap/v1/transactions'; //PRODUCTION
	}
	headers['Accept'] = 'application/json';
	headers['Content-Type'] = 'application/json';
	headers['Authorization'] = 'Basic '+new Buffer(SERVER_KEY+':').toString('base64');
	console.log('VT SEND HEADER: '+JSON.stringify(headers));
	request({ method: 'POST', url: url, headers: headers, json:req.body}, function(err, remoteResponse, remoteBody) {
        console.log('VTCHARGE BFERROR');
    	recordToken(req.headers,req.body,remoteResponse.headers,remoteBody);
        if (err) { 
			console.log('VTCHARGE ERROR: '+err);
        	return res.status(500).end('Error');  
        }
        console.log("VTNOERROR");
        console.log("VTHEADER "+JSON.stringify(remoteResponse.headers));
        console.log("VTBODY "+JSON.stringify(remoteBody));
        // res.writeHead(remoteResponse.headers); // copy all headers from remoteResponse
        res.json(remoteBody);
    });
});
router.post('/:env/charge',function(req,res,next){
	// res.redirect(307, 'https://app.sandbox.midtrans.com/snap/v1/transactions' + req.path);
	req.body.credit_card.installment = {};
	req.body.credit_card.installment.required = false;
	// req.body.credit_card.channel = "migs";
	// req.body.credit_card.bank = "mandiri";
	try{
		req.body.credit_card.installment.terms = JSON.parse('{"bni":['+config.setting.installment_bni+'],"mandiri":['+config.setting.installment_mandiri+'],"bca":['+config.setting.installment_bca+'],"cimb":['+config.setting.installment_cimb+'],"offline":['+config.setting.installment_offline+']}');
	}catch(err){
		req.body.credit_card.installment.terms = {
			bni: [],
			mandiri: [],
			bca: [],
			cimb: [],
			offline: []
		};
	}	
	console.log('VTCHARGE INIT');
	console.log('VTCHARGE '+JSON.stringify(req.body));
	var headers = {};
	// delete headers.host;
	var SERVER_KEY;
	var url;
	if(req.params.env==="debug"){
		SERVER_KEY = "VT-server-6WLfA9MggCFaXI6Rbk8lmdoi";
		url = 'https://app.sandbox.midtrans.com/snap/v1/transactions';
	}else{
		SERVER_KEY = "VT-server-0S525bemjKot1_BEqPgQUz3p"; //PRODUCTION
		url = 'https://app.midtrans.com/snap/v1/transactions'; //PRODUCTION
	}
	headers['Accept'] = 'application/json';
	headers['Content-Type'] = 'application/json';
	headers['Authorization'] = 'Basic '+new Buffer(SERVER_KEY+':').toString('base64');
	console.log('VT SEND HEADER: '+JSON.stringify(headers));
	request({ method: 'POST', url: url, headers: headers, json:req.body}, function(err, remoteResponse, remoteBody) {
        console.log('VTCHARGE BFERROR');
    	recordToken(req.headers,req.body,remoteResponse.headers,remoteBody);
        if (err) { 
			console.log('VTCHARGE ERROR: '+err);
        	return res.status(500).end('Error');  
        }
        console.log("VTNOERROR");
        console.log("VTHEADER "+JSON.stringify(remoteResponse.headers));
        console.log("VTBODY "+JSON.stringify(remoteBody));
        // res.writeHead(remoteResponse.headers); // copy all headers from remoteResponse
        res.json(remoteBody);
    });
});

module.exports = router;
