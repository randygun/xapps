var tools_fcmqueue = require(__dirname+'/../tools/tools_fcmqueue');
var tools_db = require(__dirname+'/../tools/tools_db');
var tools_email = require(__dirname+'/../tools/tools_email');
var config = require(__dirname+'/../config');
var pg = require ('pg');
pg.defaults.poolSize = 10000;
var pgConString = "postgres://"+config.db.username+":"+config.db.password+"@"+config.db.server+":5432/"+config.db.db;
var proc_printing = require(__dirname+"/proc_printing");

var GETTitle = function(notification){
  notification = JSON.parse(notification.replace(new RegExp('\"', 'g'), '"'));
	if(notification.job==="trolley_created") return notification.title;
  else if(notification.job === 'trolley_rejected') return notification.title;
  else if(notification.job === 'trolley_confirmed') return notification.title;
  else if(notification.job === 'trolley_paid') return notification.title;
  else if(notification.job === 'trolley_sent') return notification.title;
  else if(notification.job === 'trolley_done') return notification.title;
  else if(notification.job === 'order_topup') return notification.title;
  else if(notification.job === 'manual_push') return notification.title;
};

var GETContent = function(notification){
  notification = JSON.parse(notification.replace(new RegExp('\"', 'g'), '"'));
	if(notification.job==="trolley_created") return notification.message;
  else if(notification.job === 'trolley_rejected') return notification.message;
	else if(notification.job === 'trolley_confirmed') return notification.message;
  else if(notification.job === 'trolley_paid') return notification.message;
  else if(notification.job === 'trolley_sent') return notification.message;
  else if(notification.job === 'trolley_done') return notification.message;
  else if(notification.job === 'order_topup') return notification.message;
  else if(notification.job === 'manual_push') return notification.message;
};

var JOBSendMessage = function(to,notification){
  if(to!=="") {
    console.log('ADDED TO QUEUE');
    tools_fcmqueue.add(to,notification,GETTitle(notification),GETContent(notification));
  }else{
    console.log('NOT ADDED TO QUEUE');
  }
};

var JOBSettingChanged = function(newconfig){
  // tools_config.assign(newconfig);
};

var lookingForTime15Minutes = function(){
  // return 15*60*1000;
  return 60*1000;
}

var lookingForTimeOne = function(){
  var timerNext = 0;
  var proposed = new Date();
  console.log("CURRENT MONTH "+proposed.getMonth());
  console.log("CURRENT DATE "+proposed.getDate());
  proposed.setDate(proposed.getDate() + 1);
  proposed.setHours(0,1,0,0); //Jam 0 Pagi, Menit 1
  proposed.setMinutes(0);
  var proposedTime = proposed.getTime();
  var now = new Date();
  var nowTime = now.getTime();
  timerNext = proposedTime - nowTime;
  console.log("NEXT MONTHLY "+nowTime+";"+proposedTime+";"+timerNext+";"+(nowTime+timerNext));
  return timerNext;
};

var sendNotificationCancel = function(param){
  tools_db.one('SELECT dev.token_fcm,usr.id_language FROM table_user usr LEFT JOIN table_device dev ON dev.id=usr.id_device WHERE usr.id=${id_customer}',param,function(user){
    param.token_fcm = user.token_fcm;
    if(param.token_fcm === null) param.token_fcm = "";
    var title = "Order Timeout";
    var message = "Order rejected by system because no response from seller in 60 minutes. You can order same / different product to another seller / try again later.";
    var job = "trolley_rejected";
    var sent = {title:title,message:message,job:job,id:param.id_order};
    if(config.dynamic.language[user.id_language] === 'id'){
      //INDONESIA
      sent.title = "Pesanan Kadaluarsa";
      sent.message = "Order ditolak oleh sistem karena tidak ada respon dari penjual dalam waktu 60 menit. Anda dapat order produk yang sama ke seller lain pilihan Anda / coba kembali di lain waktu.";
    }
    param.sent = JSON.stringify(sent);
    tools_db.none('INSERT INTO table_notification (id_user,device_token,sent) VALUES (${id_customer},${token_fcm},${sent})',param,function(){},function(err){});
  },function(err){

  });
}

var sendNotificationNotPaid = function(param){
  tools_db.one('SELECT dev.token_fcm,usr.id_language FROM table_user usr LEFT JOIN table_device dev ON dev.id=usr.id_device WHERE usr.id=${id_customer}',param,function(user){
    param.token_fcm = user.token_fcm;
    if(param.token_fcm === null) param.token_fcm = "";
    var title = "Order Timeout";
    var message = "Order rejected by system because you are not processing any payment in 3 hours. You can order same / different product to another seller / try again later.";
    var job = "trolley_rejected";
    var sent = {title:title,message:message,job:job,id:param.id_order};
    if(config.dynamic.language[user.id_language] === 'id'){
      //INDONESIA
      sent.title = "Pesanan Kadaluarsa";
      sent.message = "Order ditolak oleh sistem karena anda tidak menyelesaikan pembayaran dalam waktu 3 hours. Anda dapat order produk yang sama ke seller lain pilihan Anda / coba kembali di lain waktu.";
    }
    param.sent = JSON.stringify(sent);
    tools_db.none('INSERT INTO table_notification (id_user,device_token,sent) VALUES (${id_customer},${token_fcm},${sent})',param,function(){},function(err){});
  },function(err){

  });
}

var doEvery15Minutes = function(){

  //CLEAR NOTIFICATION CANCEL IF STORE NOT REPSOND
  tools_db.many("UPDATE table_trolley_confirm tc SET time_close=NOW(),is_delete=TRUE,reject_who='System', reject_reason=CASE WHEN usr.id_language="+config.dynamic.language.en+" THEN 'Waktu habis. Order tidak di respon oleh penjual' ELSE CASE WHEN usr.id_language="+config.dynamic.language.id+" THEN 'Waktu habis. Order tidak di respon oleh penjual' ELSE 'Waktu habis. Order tidak di respon oleh penjual' END END FROM (SELECT id,id_language FROM table_user) usr WHERE usr.id=tc.id_customer AND tc.id IN (SELECT id FROM table_trolley_confirm WHERE time_expire< NOW() AND is_delete=FALSE AND is_agreed=FALSE) RETURNING *",undefined,function(confirms){
    confirms.forEach(function(order){
      sendNotificationCancel(order);
    });
    console.log('15 Minutes '+JSON.stringify(confirms));
  },function(err){

  });

  tools_db.many("UPDATE table_trolley_confirm tc SET time_close=NOW(),is_delete=TRUE,reject_who='System', reject_reason=CASE WHEN usr.id_language="+config.dynamic.language.en+" THEN 'Pembeli tidak memproses pembayaran dalam 3 jam' ELSE CASE WHEN usr.id_language="+config.dynamic.language.id+" THEN 'Pembeli tidak memproses pembayaran dalam 3 jam' ELSE 'Pembeli tidak memproses pembayaran dalam 3 jam' END END FROM (SELECT id, id_language AS id_language FROM table_user) usr WHERE usr.id=tc.id_customer AND tc.is_delete=FALSE AND tc.id IN (SELECT id_confirm FROM table_trolley_confirm_agree WHERE time_create< NOW() - INTERVAL '3 hours' AND is_paid=FALSE) RETURNING *",undefined,function(confirms){
    confirms.forEach(function(order){
      sendNotificationNotPaid(order);
    });
    console.log('15 Minutes '+JSON.stringify(confirms));
  },function(err){

  });

  //CLEAR TOPUP AFTER ONE DAY NO TRANSACTION
  tools_db.manyOrNone('UPDATE table_topup SET is_complete=TRUE, time_complete=NOW() WHERE time_expired<=NOW() AND is_complete=FALSE returning id',undefined,function(data){
    console.log('15 Minutes TOPUP'+JSON.stringify(data));
  },function(err){

  });
  setTimeout(doEvery15Minutes,lookingForTime15Minutes());
};

var doAtOne = function(){
  tools_db.none("UPDATE table_topup SET time_complete=NOW(),is_complete=TRUE WHERE is_complete=FALSE AND time_create<=NOW() - INTERVAL '2 days' ",undefined,function(){},function(err){});
  tools_db.many("UPDATE table_trolley_paid SET is_close=TRUE, time_close=NOW(),rating=5 WHERE is_close=FALSE AND time_close IS NULL AND is_sent=TRUE AND time_sent< NOW() - INTERVAL '2 days' RETURNING id_agree",undefined,function(paid){
    if(paid.length===0) return;
    var id_agrees = [];
    paid.forEach(function(data){
      id_agrees.push(data.id_agree);
    });
    tools_db.many('SELECT tc.id_store,tc.id FROM table_trolley_confirm_agree tca LEFT JOIN table_trolley_confirm tc ON tc.id=tca.id_confirm WHERE tca.id IN ('+id_agrees.join(',')+')',undefined,function(stores){
      if(stores.length===0) return;
      var id_stores = [];
      var mapping = {};
      var mappingagain = {};
      stores.forEach(function(data){
        mapping[data.id_store] = data.id;
        id_stores.push(data.id_store);
      });
      tools_db.many('SELECT dev.token_fcm,usr.id_language,usr.id FROM table_user usr LEFT JOIN table_device dev ON dev.id=usr.id_device WHERE usr.id_store IN ('+id_stores.join(',')+') AND usr.id_role='+config.dynamic.role.seller,undefined,function(users){
        var doing = function(user){
          var param = {};
          param.token_fcm = user.token_fcm;
          param.id_seller = user.id;
          if(param.token_fcm === null) param.token_fcm = "";
          var title = "Order Completed";
          var message = "Your order has been completed by system and given 5 stars.";
          var job = "trolley_done";
          var sent = {title:title,message:message,job:job};
          if(config.dynamic.language[user.id_language] === 'id'){
            //INDONESIA
            sent.title = "Order Telah Selesai";
            sent.message = "Order telah diselesaikan oleh System dan diberi rating 5 bintang.";
          }
          param.sent = JSON.stringify(sent);
          tools_db.none('INSERT INTO table_notification (id_user,device_token,sent) VALUES (${id_seller},${token_fcm},${sent})',param,function(){},function(err){});
        };

        users.forEach(function(user){
          doing(user);
        });
      },function(err){

      });
    },function(err){

    });
    console.log('SUCCESS');
  },function(err){
    console.log('FAIL');
  });
  setTimeout(doAtOne,lookingForTimeOne());
}

// setTimeout(doAtOne,lookingForTimeOne());
// setTimeout(doEvery15Minutes,lookingForTime15Minutes());

var JOBOrderReject = function(id_trolley_confirm){
  var param = {};
  param.id = id_trolley_confirm;
  param.role_seller = config.dynamic.role.seller;
  tools_db.one('\n\
    SELECT buyer.id_language,buyer.username AS buyer,seller.username AS seller, seller.name AS name_seller, buyer.name AS name_buyer,tc.id,tc.reject_reason \n\
    FROM table_trolley_confirm tc \n\
    LEFT JOIN table_user buyer ON buyer.id=tc.id_customer \n\
    LEFT JOIN (SELECT * FROM table_user WHERE id_role=${role_seller}) seller ON seller.id_store=tc.id_store\n\
    WHERE tc.id=${id}',param,function(order){
      tools_email.workersend([order.seller],'Pesanan Dibatalkan','template_email_order_reject',{
        attachments:[
          {
            fileName:'tunjukmaterial.png',
            filePath: __dirname+"/../public/images/tm_green.png",
            cid: 'tmpicture'
          },
          {
            fileName:'SalesOrder.pdf',
            filePath: __dirname+"/../public/salesorder/SalesOrder"+order.id+".pdf"
          }
        ],
        reject_reason: order.reject_reason,
        name: order.name_seller,
        support:{
          phone: config.setting.support_phone,
          email: config.setting.support_email,
          operationaltime: config.setting.support_operationaltime
        }
      });
      tools_email.workersend([order.buyer],'Pesanan Dibatalkan','template_email_order_reject',{
        attachments:[
          {
            fileName:'tunjukmaterial.png',
            filePath: __dirname+"/../public/images/tm_red.png",
            cid: 'tmpicture'
          },
          {
            fileName:'SalesOrder.pdf',
            filePath: __dirname+"/../public/salesorder/SalesOrder"+order.id+".pdf"
          }
        ],
        reject_reason: order.reject_reason,
        name: order.name_buyer,
        support:{
          phone: config.setting.support_phone,
          email: config.setting.support_email,
          operationaltime: config.setting.support_operationaltime
        }
      });
    },function(err){

    });
}

var JOBOrderComplete = function(id_trolley_paid){
  var param = {};
  param.id = id_trolley_paid;
  param.role_seller = config.dynamic.role.seller;
  tools_db.one('\n\
    SELECT buyer.username AS buyer,seller.username AS seller,seller.name AS name_seller,buyer.name AS name_buyer,tc.id \n\
    FROM table_trolley_paid tp \n\
    LEFT JOIN table_trolley_confirm_agree ta ON ta.id=tp.id_agree\n\
    LEFT JOIN table_trolley_confirm tc ON tc.id=ta.id_confirm\n\
    LEFT JOIN table_user buyer ON buyer.id=tc.id_customer \n\
    LEFT JOIN (SELECT * FROM table_user WHERE id_role=${role_seller}) seller ON seller.id_store=tc.id_store\n\
    WHERE tp.id=${id}',param,function(order){
      tools_email.workersend([order.seller],'Order Selesai','template_email_order_complete_seller',{
        attachments:[
          {
            fileName:'tunjukmaterial.png',
            filePath: __dirname+"/../public/images/tm_green.png",
            cid: 'tmpicture'
          },
          {
            fileName:'SalesOrder.pdf',
            filePath: __dirname+"/../public/salesorder/SalesOrder"+order.id+".pdf"
          }
        ],
        name: order.name_seller,
        support:{
          phone: config.setting.support_phone,
          email: config.setting.support_email,
          operationaltime: config.setting.support_operationaltime
        }
      });
      tools_email.workersend([order.buyer],'Order Selesai','template_email_order_complete_buyer',{
        attachments:[
          {
            fileName:'tunjukmaterial.png',
            filePath: __dirname+"/../public/images/tm_red.png",
            cid: 'tmpicture'
          },
          {
            fileName:'SalesOrder.pdf',
            filePath: __dirname+"/../public/salesorder/SalesOrder"+order.id+".pdf"
          }
        ],
        name: order.name_buyer,
        support:{
          phone: config.setting.support_phone,
          email: config.setting.support_email,
          operationaltime: config.setting.support_operationaltime
        }
      });
    },function(err){

    });
}

var JOBSellerPaid = function(id_trolley_paid){
  var param = {};
  param.id = id_trolley_paid;
  param.role_seller = config.dynamic.role.seller;
  tools_db.one('\n\
    SELECT buyer.username AS buyer,seller.username AS seller,tc.id,seller.name AS name_seller \n\
    FROM table_trolley_paid tp \n\
    LEFT JOIN table_trolley_confirm_agree ta ON ta.id=tp.id_agree\n\
    LEFT JOIN table_trolley_confirm tc ON tc.id=ta.id_confirm\n\
    LEFT JOIN table_user buyer ON buyer.id=tc.id_customer \n\
    LEFT JOIN (SELECT * FROM table_user WHERE id_role=${role_seller}) seller ON seller.id_store=tc.id_store\n\
    WHERE tp.id=${id}',param,function(order){
      tools_email.workersend([order.seller],'Order Dibayarkan','template_email_seller_paid',{
        attachments:[
          {
            fileName:'tunjukmaterial.png',
            filePath: __dirname+"/../public/images/tm_green.png",
            cid: 'tmpicture'
          }
        ],
        name: order.name_seller,
        support:{
          phone: config.setting.support_phone,
          email: config.setting.support_email,
          operationaltime: config.setting.support_operationaltime
        }
      });
          // ,{
          //   fileName:'SalesOrder.pdf',
          //   filePath: __dirname+"/../public/salesorder/SalesOrder"+order.id+".pdf"
          // }
    },function(err){

    });
};

var JOBMailPool = function(notification){
  console.log("JOBMAILPOOL:"+JSON.stringify(notification));
  var array_to = notification.to;
  var subject = notification.title;
  var template_jade = notification.template;
  var param = notification.param;
  var paramdb = {
    id: notification.id
  };
  tools_email.workersend(array_to,subject,template_jade,param,function(err){
    if(typeof err === 'undefined') paramdb.result = null;
    else paramdb.result = JSON.stringify(err);
    tools_db.one('UPDATE table_email SET result=${result},time_result=NOW() WHERE id=${id} RETURNING id',paramdb,function(data){},function(err){});
  });
};

pg.connect(pgConString, function(err, client, done) {
  if(err) {
    console.log('SPECIAL PGCONNECT FAIL'+err);
  }
  console.log('SPECIAL PGCONNECT SUCCESS');
  client.on('notification', function(msg) {
  	// io.emit('debug', msg.payload);
  	console.log("SPECIAL PGNOTIFICATION SYSTEM IN SPECIAL"+JSON.stringify(msg));
    var notification = JSON.parse(msg.payload);
    if(notification.job==="setting_changed"){
    	JOBSettingChanged(notification.config);
    }else if(notification.job === "push_notification"){
    	JOBSendMessage(notification.device_token,notification.sent);
    }else if(notification.job === "order_reject"){
      proc_printing.pdfSO(notification.id_order,"DITOLAK",function(){
        JOBOrderReject(notification.id_order);
      });
    }else if(notification.job === "order_complete"){
      JOBOrderComplete(notification.id_order);
    }else if(notification.job === "seller_paid"){
      JOBSellerPaid(notification.id_order);
    }else if(notification.job === "email_pool"){
      JOBMailPool(notification);
    }
  });
  client.on('error',function(err){
  	console.log("SPECIAL PGNOTIFICATION WATCH ERROR "+JSON.stringify(err));
  });
  // var query = client.query("LISTEN watch_realtime_"+socket.handshake.query.id_gps);
  console.log("SPECIAL PGNOTIFICATION WATCH LISTEN watch_system");
  var query = client.query("LISTEN watch_system");  
  console.log("PGNOTIFICATION WATCH LISTEN watch_system DONE.");
});

doEvery15Minutes();
doAtOne();
