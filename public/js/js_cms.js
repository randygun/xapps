document.onclick = function (e) {
  e = e ||  window.event;
  var element = e.target || e.srcElement;
  if (element.tagName == 'A') {
  	if(element.getAttribute("href").indexOf("#")===0) {
  		// element.href += "AAAA"; --> it works
  		return true;
  	}else if(element.getAttribute("href").indexOf("://")===-1){
      element.setAttribute("href",js_cms_fullhost+element.getAttribute("href"));
      return true;
    }
  	//DOING SOMETHING FIRST
    // return false; // prevent default action and stop event propagation
    return true;
  }
};

var startProgressUploadFile = function(){
    $('.progress').attr('style','');
    $('.progress-bar').text('0%');
      $('.progress-bar').width('0%');
  };

var hideProgressUploadFile = function(){
  $('.progress').attr('style','display: none;');
  $('.progress-bar').text('0%');
    $('.progress-bar').width('0%');
};

var uploadSingleFileAutomatic = function(id_input,callback_success,callback_fail){
  console.log('request on change '+id_input);
  $('#'+id_input).on('change', function(){
    console.log('file changed');
    var files = $(this).get(0).files;
    if (files.length > 0){
      startProgressUploadFile();
      var formData = new FormData();
      for (var i = 0; i < files.length; i++) {
        var file = files[i];
        formData.append(id_input, file, file.name);
      }
      showLoading();
      apiFILE("api/upload",formData,function(data){
        if(data.uploaded[id_input].length>0){
          var picture = data.uploaded[id_input][0];
          console.log('PICTURE: '+picture);
          callback_success(picture);
        }else{
          hideLoading();
          callback_fail();
        }
      },function(err){
        callback_fail();
      });
    }else{
      hideProgressUploadFile();
      callback_fail();
    }
  });
};

var uploadSingleFile = function(id_input,callback_success,callback_fail){
  var files = $("#"+id_input).get(0).files;
  if (files.length > 0){
    startProgressUploadFile();
    var formData = new FormData();
    for (var i = 0; i < files.length; i++) {
      var file = files[i];
      formData.append(id_input, file, file.name);
    }
    showLoading();
    apiFILE("api/upload",formData,function(data){
      if(data.uploaded[id_input].length>0){
        var picture = data.uploaded[id_input][0];
        console.log('PICTURE: '+picture);
        callback_success(picture);
      }else{
        hideLoading();
        callback_fail();
      }
    },function(err){
      callback_fail();
    });
  }else{
    hideProgressUploadFile();
    callback_fail();
  }
};

var goTo = function(page){
  var url = js_cms_fullhost+page;
  console.log("GOTO "+url);
  // alert(url);
  window.location.href = url;
};

var showLoading = function(id){
  if(typeof id === "undefined") id = "loading";
  $("#"+id).attr("style","");
};

var hideLoading = function(id){
  if(typeof id === "undefined") id = "loading";
  $("#"+id).attr("style","display: none;");
};

var tokenRenew = function(callback_ok,callback_nok){
  apiPOST("api/token/renew",{token_session:token_session},function(data){
    token_access = data.token.token_access;
    token_session = data.token.token_session;
    callback_ok();
  },function(err){
    callback_nok();
  });
};

var apiGEN = function(method,url,urldata,callback_ok,callback_nok){
  var i = 0;
  for (var key in urldata) {
      if (urldata.hasOwnProperty(key)) {
        var value = urldata[key];
        if(i===0){
          url += "?"+key+"="+encodeURIComponent(value);
        }else{
          url += "&"+key+"="+encodeURIComponent(value);
        }
        i++;
      }
  }
  $.ajax(
    {
      type:method,
      url:js_cms_fullhost+url,
      headers:{
        "Token-Access":token_access
      },
      success:callback_ok,
      dataType:"json"
    }
  ).fail(function(err){
    if(typeof err!=="undefined" && typeof err.status!=="undefined"){
      if(parseInt(err.status)===403){
        //TOKEN EXPIRED
        tokenRenew(function(){
          apiGEN(method,url,urldata,callback_ok,callback_nok);
        },function(){
          callback_nok();
        });
        return;
      }else if(parseInt(err.status)===401){
        //NEED LOGIN
        window.location.href = "../../logout";
        return;
      }else if(parseInt(err.status)===422){
        var arrayMessage = err.responseJSON.error.messages;
        var messages = arrayMessage.join(",");
        showNotification(messages);
        return;
      }
    }
    console.log(JSON.stringify(err));
  });
};

var apiGET = function(url,urldata,callback_ok,callback_nok){
  apiGEN("GET",url,urldata,callback_ok,callback_nok);
};

var apiDELETE = function(url,urldata,callback_ok,callback_nok){
  apiGEN("DELETE",url,urldata,callback_ok,callback_nok);
};

var apiPATCH = function(url,urldata,callback_ok,callback_nok){
  apiGEN("PATCH",url,urldata,callback_ok,callback_nok);
};

var apiPUT = function(url,urldata,callback_ok,callback_nok){
  apiGEN("PUT",url,urldata,callback_ok,callback_nok);
};

var listenModal = function(id,callback){
  $('#'+id).on('hidden.bs.modal', function () {
    callback();
  });
};

var listenNotification = function(callback){
  listenModal("notificationModal",callback);
};

var showNotification = function(content){
  $("#notificationModalContent").html(content);
  $("#notificationModal").modal("show");
};

var apiPOST = function(url,postdata,callback_ok,callback_nok){
  var request = this;
  $.ajax(
    {
      type:'POST',
      url:js_cms_fullhost+url,
      headers:{
        "Token-Access":token_access
      },
      data:postdata,
      success:callback_ok,
      dataType:"json"
    }
  ).fail(function(err){
    if(typeof err!=="undefined" && typeof err.status!=="undefined"){
      if(parseInt(err.status)===403){
        //TOKEN EXPIRED
        tokenRenew(function(){
          apiPOST(url,postdata,callback_ok,callback_nok);
        },function(){
          callback_nok();
        });
        return;
      }else if(parseInt(err.status)===401){
        //NEED LOGIN
        window.location.href = "../../logout";
        return;
      }else if(parseInt(err.status)===422){
        var arrayMessage = err.responseJSON.error.messages;
        var messages = arrayMessage.join(",");
        showNotification(messages);
        return;
      }
    }
    callback_nok();
    console.log(JSON.stringify(err));
  });
};

var apiFILE = function(url,postdata,callback_ok,callback_nok){
  var request = this;
  $.ajax(
    {
      type:'POST',
      url:js_cms_fullhost+url,
      headers:{
        "Token-Access":token_access
      },
      data:postdata,
      success:callback_ok,
      processData: false,
      contentType: false,
      dataType:"json",
      xhr: function() {
        // create an XMLHttpRequest
        var xhr = new XMLHttpRequest();

        // listen to the 'progress' event
        xhr.upload.addEventListener('progress', function(evt) {

          if (evt.lengthComputable) {
            // calculate the percentage of upload completed
            var percentComplete = evt.loaded / evt.total;
            percentComplete = parseInt(percentComplete * 100);

            // update the Bootstrap progress bar with the new percentage
            $('.progress-bar').text(percentComplete + '%');
            $('.progress-bar').width(percentComplete + '%');

            // once the upload reaches 100%, set the progress bar text to done
            if (percentComplete === 100) {
              $('.progress-bar').html('Done');
            }

          }

        }, false);
        return xhr;
      }
    }
  ).fail(function(err){
    if(typeof err!=="undefined" && typeof err.status!=="undefined"){
      if(parseInt(err.status)===403){
        //TOKEN EXPIRED
        tokenRenew(function(){
          apiPOST(url,postdata,callback_ok,callback_nok);
        },function(){
          callback_nok();
        },token_access);
        return;
      }else if(parseInt(err.status)===401){
        //NEED LOGIN
        window.location.href = goTo("logout");
        return;
      }else if(parseInt(err.status)===422){
        var arrayMessage = err.responseJSON.error.messages;
        var messages = arrayMessage.join(",");
        showNotification(messages);
        return;
      }
    }
    callback_nok();
    console.log(JSON.stringify(err));
  });
};

var loadTable = function(table_id,api_url){
  var loadTableConnection = function(sSource, aoData, fnCallback, oSettings){    
    var searchString = "";      
    aoData.forEach(function(row){
      if(row.name==="search"){
        console.log("DATA"+JSON.stringify(row));
        searchString = row.value.value;
      }
    });
    oSettings.jqXHR = $.ajax( {
      dataType: 'json',
      type: "GET",
      url: js_cms_fullhost+api_url+"?searchString="+encodeURIComponent(searchString),
      headers:{
            "Token-Access":token_access
          },
      data: aoData,
      success: fnCallback
    }).fail(function(err){
      //ERORR HERE
      if(typeof err!=="undefined" && typeof err.status!=="undefined"){
        if(parseInt(err.status)===403){
          tokenRenew(function(){
                loadTableConnection(sSource, aoData, fnCallback, oSettings);
              },function(){
                console.log("Unable to renew");
                // callback_nok();
              },token_access);
              return;
        }
      }
      
    });
  };

  $('#'+table_id).DataTable( {
      processing: true,
      serverSide: true,
      bSort : false,
      fnServerData: loadTableConnection
  });
};

var hookOnReady = function(callback_ready){
  $(document).ready(function() {
    callback_ready();
  });
};