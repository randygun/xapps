$.fn.serializeObject = function()
{
    var o = {};
    var a = this.serializeArray();
    $.each(a, function() {
        if (o[this.name] !== undefined) {
            if (!o[this.name].push) {
                o[this.name] = [o[this.name]];
            }
            o[this.name].push(this.value || '');
        } else {
            o[this.name] = this.value || '';
        }
    });
    return o;
};

var is_first = false;
Number.prototype.formatMoney = function(c, d, t){  
var n = this, 
    c = isNaN(c = Math.abs(c)) ? 2 : c, 
    d = d == undefined ? "," : d, 
    t = t == undefined ? "." : t, 
    s = n < 0 ? "-" : "", 
    i = parseInt(n = Math.abs(+n || 0).toFixed(c)) + "", 
    j = (j = i.length) > 3 ? j % 3 : 0;
   return s + (j ? i.substr(0, j) + t : "") + i.substr(j).replace(/(\d{3})(?=\d)/g, "$1" + t) + (c ? d + Math.abs(n - i).toFixed(c).slice(2) : "");
};

var goTo = function(page){
  var url = js_cms_fullhost+page;
  console.log("GOTO "+url);
  // alert(url);
  window.location.href = url;
};

document.onclick = function (e) {
  e = e ||  window.event;
  var element = e.target || e.srcElement;
  if (element.tagName == 'A') {
  	if(element.getAttribute("href")==="#") {
  		// element.href += "AAAA"; --> it works
  		return true;
  	}
  	//DOING SOMETHING FIRST
    // return false; // prevent default action and stop event propagation
    return true;
  }
};

var showLoading = function(id){
  if(typeof id === "undefined") id = "loading";
  $("#"+id).attr("style","");
};

var hideLoading = function(id){
  if(typeof id === "undefined") id = "loading";
  $("#"+id).attr("style","display: none;");
};

var isRenewingToken = false;
var renewPool = [];

var executeTest = function(callback_ok){
  console.log('tokenRenew do it');
  callback_ok();
};

var tokenRenew = function(callback_ok,callback_nok,current_token){
  if(isRenewingToken) {
    console.log('tokenRenew IS RENEWING');
    renewPool.push({callback_ok:callback_ok,callback_nok:callback_nok});
    return;
  }else if(current_token!==token_access){
    console.log('tokenRenew IS different');
    //Klo tidak sama, kemungkinan dah di renew langsung OK aja
    callback_ok();
    return;
  }
  console.log('tokenRenew just push');
  renewPool.push({callback_ok:callback_ok,callback_nok:callback_nok});
  isRenewingToken = true;
  apiPOST("api/token/renew",{token_session:token_session},function(data){
    console.log('tokenRenew done');
    token_access = data.token.token_access;
    token_session = data.token.token_session;
    isRenewingToken = false;
    renewPool.forEach(function(baris){
      console.log('tokenRenew push');
      executeTest(callback_ok);      
    });
    delete renewPool;
    console.log('tokenRenew push done');
    renewPool = [];
  },function(err){
    isRenewingToken = false;
    renewPool.forEach(function(row){
      row.callback_nok();
    });
    delete renewPool;
    renewPool = [];
  });
}

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
        },token_access);
        return;
      }else if(parseInt(err.status)===401){
        //NEED LOGIN
        window.location.href = goTo("logout");
        return;
      }else if(parseInt(err.status)===422){
        var messages = err.responseJSON.error.messages;
        showNotification(messages);
        return;
      }
    }
    console.log(JSON.stringify(err));
    callback_nok();
  });
}

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

var showNotificationText = function(content){
  $("#notificationModalContent").text(content);
  $("#notificationModal").modal("show");
};

var showModal = function(id){
  $("#"+id).modal("show");
}
var hideModal = function(id){
  $("#"+id).modal("hide");
}

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
          console.log("token renew success");
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
        var messages = err.responseJSON.error.messages;
        showNotification(messages);
        return;
      }
    }
    callback_nok();
    console.log(JSON.stringify(err));
  });
};

var writeProgress = function(text){
  $('.progress-bar').html(text);
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
              $('.progress-bar').html('Uploaded...');
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
        var messages = err.responseJSON.error.messages;
        showNotification(messages);
        return;
      }
    }
    callback_nok();
    console.log(JSON.stringify(err));
  });
};

var loadTable = function(table_id,api_url,paramCallback){
  var refreshParam = function(){
    var paramString = "";
    if(typeof paramCallback === "undefined") return paramString;
    var param = paramCallback();
    if(typeof param!=="undefined" && param!==null){
      for (var key in param) {
        if (param.hasOwnProperty(key)) {
          console.log("KP "+key+"="+param[key]);
          paramString+="&"+encodeURIComponent(key)+"="+encodeURIComponent(param[key]);
        }
      }
    };
    console.log("paramString "+paramString);
    return paramString;
  };
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
      url: js_cms_fullhost+api_url+"?searchString="+encodeURIComponent(searchString)+refreshParam(),
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
      
    }).success(function(data){
      // alert(JSON.stringify(data));
      $('#'+table_id).trigger('tableloaded',data);
    });
  };

  return $('#'+table_id).DataTable( {
      processing: true,
      serverSide: true,
      bSort : false,
      fnServerData: loadTableConnection
  });
};

$(document).ready(function() {
    $( function() {
      if(navigator.userAgent.toLowerCase().indexOf('firefox') > -1){
        // Do Firefox-related activities
        $('input[type=date]').datepicker({format: "yyyy-mm-dd"});
        console.log("ALALALLA");
      }

    });
});

var hookOnReady = function(callback_ready){
  $(document).ready(function() {
    callback_ready();
  });
};

Date.prototype.getWeekNumber = function() {
    var onejan = new Date(this.getFullYear(), 0, 1);
    var wn = Math.ceil((((this - onejan) / 86400000) + onejan.getDay() + 1) / 7)-1;
    if(wn<0) return 0;
    else return wn;
}

var parseGET = function(){
  var result = {};
  var splitted = location.search.substr(1).split("&");
  if(splitted[0]==="") return result;
  splitted.forEach(function (item) {
    console.log("parseGET"+item);
    var tmp = item.split("=");
    result[tmp[0]] = decodeURIComponent(item.substr(tmp[0].length + 1));
  });
  return result;
}

hookModalShow = function(id,callback){
  $("#"+id).on("shown.bs.modal", function () { 
    callback();
  });
};

getForm = function(id){
  return $("#"+id).serializeObject();
};

var areaChartOptions = {
  //Boolean - If we should show the scale at all
  showScale: true,
  //Boolean - Whether grid lines are shown across the chart
  scaleShowGridLines: false,
  //String - Colour of the grid lines
  scaleGridLineColor: "rgba(0,0,0,.05)",
  //Number - Width of the grid lines
  scaleGridLineWidth: 1,
  //Boolean - Whether to show horizontal lines (except X axis)
  scaleShowHorizontalLines: true,
  //Boolean - Whether to show vertical lines (except Y axis)
  scaleShowVerticalLines: true,
  //Boolean - Whether the line is curved between points
  bezierCurve: true,
  //Number - Tension of the bezier curve between points
  bezierCurveTension: 0.3,
  //Boolean - Whether to show a dot for each point
  pointDot: false,
  //Number - Radius of each point dot in pixels
  pointDotRadius: 4,
  //Number - Pixel width of point dot stroke
  pointDotStrokeWidth: 1,
  //Number - amount extra to add to the radius to cater for hit detection outside the drawn point
  pointHitDetectionRadius: 20,
  //Boolean - Whether to show a stroke for datasets
  datasetStroke: true,
  //Number - Pixel width of dataset stroke
  datasetStrokeWidth: 2,
  //Boolean - Whether to fill the dataset with a color
  datasetFill: true,
  //String - A legend template
  legendTemplate: "<ul class=\"<%=name.toLowerCase()%>-legend\"><% for (var i=0; i<datasets.length; i++){%><li><span style=\"background-color:<%=datasets[i].lineColor%>\"></span><%if(datasets[i].label){%><%=datasets[i].label%><%}%></li><%}%></ul>",
  //Boolean - whether to maintain the starting aspect ratio or not when responsive, if set to false, will take up entire container
  maintainAspectRatio: true,
  //Boolean - whether to make the chart responsive to window resizing
  responsive: true
};

var array_color_chart = ['rgba(60,141,188,0.9)','rgba(210, 214, 222, 1)'];
var array_color_chart_stroke = ['rgba(60,141,188,1)','rgba(220,220,220,1)'];

var genAreaData = function(labels,datas){
  var tr = {
    labels: labels,
    datasets: []
  }
  var i = 0;
  datas.forEach(function(data){
    tr.datasets.push(
      {
        label: data.label,
        fillColor: array_color_chart[i%array_color_chart.length],
        strokeColor: array_color_chart[i%array_color_chart.length],
        pointColor: array_color_chart[i%array_color_chart.length],
        pointStrokeColor: array_color_chart[i%array_color_chart.length],
        pointHighlightFill: "#fff",
        pointHighlightStroke: array_color_chart_stroke[i%array_color_chart_stroke.length],
        data: data.data
      });
    i++;
  });
  return tr;
};

var lineChartOptions = areaChartOptions;
lineChartOptions.datasetFill = false;

var drawAreaChart = function(id,labels,datas){
  var areaChartCanvas = $("#"+id).get(0).getContext("2d");
  var areaChart = new Chart(areaChartCanvas);
  areaChart.Line(genAreaData(labels,datas), areaChartOptions);
}

var drawLineChart = function(id,labels,datas){
  var lineChartCanvas = $("#"+id).get(0).getContext("2d");
  var lineChart = new Chart(lineChartCanvas);
  lineChart.Line(genAreaData(labels,datas), lineChartOptions);
}

var prepareSelect2 = function(id,apipath,callback_onchange){
  $("#"+id).select2({
    ajax: {
      url: js_cms_fullhost+apipath,
      delay: 250,
      headers:{
      "Token-Access":token_access
      },
      dataType:"json",
      processResults: function (data, params) {
        return {
              results: data
            };
      }
    }
  }).on('change',function(e){
    callback_onchange($("#"+id).select2('data')[0].id);
  });
};

// yepnope({ /* included with Modernizr */
//   test : Modernizr.inputtypes.date,
//   nope : {
//     'css': js_cms_fullhost+'plugins/datepicker/datepicker3.css',
//     'js': js_cms_fullhost+'plugins/datepicker/bootstrap-datepicker.js'
//   },
//   callback: { // executed once files are loaded
//     'js': function() { $('input[type=date]').datepicker({dateFormat: "yy-mm-dd"}); } // default HTML5 format
//   }
// });

