$(document).ready(function(){
    var URL = "11DSG8d5wOI3-6H78pQrLYyxVrJcMi9ChEA2VnzrzQL8";
    Tabletop.init( { key: URL, callback: getUsers, simpleSheet: true } )
});

var users = {};

function getUsers(data) {
    console.log(data);
    for (var i = 0; i < data.length; i++) {
        console.log(data[i]);
        users[data[i]['usr']] = data[i]['pwd'];
    }
    console.log(users);
}


 // $('#submit').click(function() {
 //    console.log("youhaveasyntaxerror");
    // console.log($('#pwd').val());
    // console.log($('#un').val());
    // if ($('#un').val() in users) {
    //     console.log("username is in user");
    //     if ($('#pwd').val() == users[$('#un').val()]){
    //         alert("You are in!");

    //     }
    // }
  // });

// $('#submit2').click(function() {
//     console.log("yo");
// });

function submitClick() {
  console.log("yo");
  console.log($('#un').val());
  console.log($('#pwd').val());
   if ($('#un').val() in users) {
        console.log("username is in user");
        if ($('#pwd').val() == users[$('#un').val()]){
            alert("You are in!");
        } else {
          alert("Your username or password seems to be incorrect. Please try again or create a new account with us!");
        }
}
}       

 (function(global) {
  "use strict";

  var inNodeJS = false;
  if (typeof module !== 'undefined' && module.exports) {
    inNodeJS = true;
    var request = require('request');
  }

  var supportsCORS = false;
  var inLegacyIE = false;
  try {
    var testXHR = new XMLHttpRequest();
    if (typeof testXHR.withCredentials !== 'undefined') {
      supportsCORS = true;
    } else {
      if ("XDomainRequest" in window) {
        supportsCORS = true;
        inLegacyIE = true;
      }
    }
  } catch (e) { }

  var indexOfProto = Array.prototype.indexOf;
  var ttIndexOf = function(array, item) {
    var i = 0, l = array.length;

    if (indexOfProto && array.indexOf === indexOfProto) return array.indexOf(item);
    for (; i < l; i++) if (array[i] === item) return i;
    return -1;
  };

  var Tabletop = function(options) {
    // Make sure Tabletop is being used as a constructor no matter what.
    if(!this || !(this instanceof Tabletop)) {
      return new Tabletop(options);
    }

    if(typeof(options) === 'string') {
      options = { key : options };
    }

    this.callback = options.callback;
    this.wanted = options.wanted || [];
    this.key = options.key;
    this.simpleSheet = !!options.simpleSheet;
    this.parseNumbers = !!options.parseNumbers;
    this.wait = !!options.wait;
    this.reverse = !!options.reverse;
    this.postProcess = options.postProcess;
    this.debug = !!options.debug;
    this.query = options.query || '';
    this.orderby = options.orderby;
    this.endpoint = options.endpoint || "https://spreadsheets.google.com";
    this.singleton = !!options.singleton;
    this.simple_url = !!options.simple_url;
    this.callbackContext = options.callbackContext;

    if(typeof(options.proxy) !== 'undefined') {
      this.endpoint = options.proxy.replace(/\/$/,'');
      this.simple_url = true;
      this.singleton = true;
      supportsCORS = false
    }

    this.parameterize = options.parameterize || false;

    if(this.singleton) {
      if(typeof(Tabletop.singleton) !== 'undefined') {
        this.log("WARNING! Tabletop singleton already defined");
      }
      Tabletop.singleton = this;
    }

    if(/key=/.test(this.key)) {
      this.log("You passed an old Google Docs url as the key! Attempting to parse.");
      this.key = this.key.match("key=(.*?)&")[1];
    }

    if(/pubhtml/.test(this.key)) {
      this.log("You passed a new Google Spreadsheets url as the key! Attempting to parse.");
      this.key = this.key.match("d\\/(.*?)\\/pubhtml")[1];
    }

    if(!this.key) {
      this.log("You need to pass Tabletop a key!");
      return;
    }

    this.log("Initializing with key " + this.key);

    this.models = {};
    this.model_names = [];

    this.base_json_path = "/feeds/worksheets/" + this.key + "/public/basic?alt=";

    if (inNodeJS || supportsCORS) {
      this.base_json_path += 'json';
    } else {
      this.base_json_path += 'json-in-script';
    }

    if(!this.wait) {
      this.fetch();
    }
  };

  Tabletop.callbacks = {};

  Tabletop.init = function(options) {
    return new Tabletop(options);
  };

  Tabletop.sheets = function() {
    this.log("Times have changed! You'll want to use var tabletop = Tabletop.init(...); tabletop.sheets(...); instead of Tabletop.sheets(...)");
  };

  Tabletop.prototype = {

    fetch: function(callback) {
      if(typeof(callback) !== "undefined") {
        this.callback = callback;
      }
      this.requestData(this.base_json_path, this.loadSheets);
    },

    requestData: function(path, callback) {
      if (inNodeJS) {
        this.serverSideFetch(path, callback);
      } else {
        var protocol = this.endpoint.split("//").shift() || "http";
        if (supportsCORS && (!inLegacyIE || protocol === location.protocol)) {
          this.xhrFetch(path, callback);
        } else {
          this.injectScript(path, callback);
        }
      }
    },

    xhrFetch: function(path, callback) {
      var xhr = inLegacyIE ? new XDomainRequest() : new XMLHttpRequest();
      xhr.open("GET", this.endpoint + path);
      var self = this;
      xhr.onload = function() {
        try {
          var json = JSON.parse(xhr.responseText);
        } catch (e) {
          console.error(e);
        }
        callback.call(self, json);
      };
      xhr.send();
    },

    injectScript: function(path, callback) {
      var script = document.createElement('script');
      var callbackName;

      if(this.singleton) {
        if(callback === this.loadSheets) {
          callbackName = 'Tabletop.singleton.loadSheets';
        } else if (callback === this.loadSheet) {
          callbackName = 'Tabletop.singleton.loadSheet';
        }
      } else {
        var self = this;
        callbackName = 'tt' + (+new Date()) + (Math.floor(Math.random()*100000));
        Tabletop.callbacks[ callbackName ] = function () {
          var args = Array.prototype.slice.call( arguments, 0 );
          callback.apply(self, args);
          script.parentNode.removeChild(script);
          delete Tabletop.callbacks[callbackName];
        };
        callbackName = 'Tabletop.callbacks.' + callbackName;
      }

      var url = path + "&callback=" + callbackName;

      if(this.simple_url) {
        if(path.indexOf("/list/") !== -1) {
          script.src = this.endpoint + "/" + this.key + "-" + path.split("/")[4];
        } else {
          script.src = this.endpoint + "/" + this.key;
        }
      } else {
        script.src = this.endpoint + url;
      }

      if (this.parameterize) {
        script.src = this.parameterize + encodeURIComponent(script.src);
      }

      document.getElementsByTagName('script')[0].parentNode.appendChild(script);
    },

    serverSideFetch: function(path, callback) {
      var self = this
      request({url: this.endpoint + path, json: true}, function(err, resp, body) {
        if (err) {
          return console.error(err);
        }
        callback.call(self, body);
      });
    },

    isWanted: function(sheetName) {
      if(this.wanted.length === 0) {
        return true;
      } else {
        return (ttIndexOf(this.wanted, sheetName) !== -1);
      }
    },

    data: function() {

      if(this.model_names.length === 0) {
        return undefined;
      }
      if(this.simpleSheet) {
        if(this.model_names.length > 1 && this.debug) {
          this.log("WARNING You have more than one sheet but are using simple sheet mode! Don't blame me when something goes wrong.");
        }
        return this.models[ this.model_names[0] ].all();
      } else {
        return this.models;
      }
    },

    addWanted: function(sheet) {
      if(ttIndexOf(this.wanted, sheet) === -1) {
        this.wanted.push(sheet);
      }
    },

    loadSheets: function(data) {
      var i, ilen;
      var toLoad = [];
      this.foundSheetNames = [];

      for(i = 0, ilen = data.feed.entry.length; i < ilen ; i++) {
        this.foundSheetNames.push(data.feed.entry[i].title.$t);
        if( this.isWanted(data.feed.entry[i].content.$t) ) {
          var linkIdx = data.feed.entry[i].link.length-1;
          var sheet_id = data.feed.entry[i].link[linkIdx].href.split('/').pop();
          var json_path = "/feeds/list/" + this.key + "/" + sheet_id + "/public/values?alt="
          if (inNodeJS || supportsCORS) {
            json_path += 'json';
          } else {
            json_path += 'json-in-script';
          }
          if(this.query) {
            json_path += "&sq=" + this.query;
          }
          if(this.orderby) {
            json_path += "&orderby=column:" + this.orderby.toLowerCase();
          }
          if(this.reverse) {
            json_path += "&reverse=true";
          }
          toLoad.push(json_path);
        }
      }

      this.sheetsToLoad = toLoad.length;
      for(i = 0, ilen = toLoad.length; i < ilen; i++) {
        this.requestData(toLoad[i], this.loadSheet);
      }
    },

    sheets: function(sheetName) {
      if(typeof sheetName === "undefined") {
        return this.models;
      } else {
        if(typeof(this.models[ sheetName ]) === "undefined") {
          return;
        } else {
          return this.models[ sheetName ];
        }
      }
    },

    loadSheet: function(data) {
      var model = new Tabletop.Model( { data: data,
                                    parseNumbers: this.parseNumbers,
                                    postProcess: this.postProcess,
                                    tabletop: this } );
      this.models[ model.name ] = model;
      if(ttIndexOf(this.model_names, model.name) === -1) {
        this.model_names.push(model.name);
      }
      this.sheetsToLoad--;
      if(this.sheetsToLoad === 0)
        this.doCallback();
    },

    doCallback: function() {
      if(this.sheetsToLoad === 0) {
        this.callback.apply(this.callbackContext || this, [this.data(), this]);
      }
    },

    log: function(msg) {
      if(this.debug) {
        if(typeof console !== "undefined" && typeof console.log !== "undefined") {
          Function.prototype.apply.apply(console.log, [console, arguments]);
        }
      }
    }

  };

  Tabletop.Model = function(options) {
    var i, j, ilen, jlen;
    this.column_names = [];
    this.name = options.data.feed.title.$t;
    this.elements = [];
    this.raw = options.data; 

    if(typeof(options.data.feed.entry) === 'undefined') {
      options.tabletop.log("Missing data for " + this.name + ", make sure you didn't forget column headers");
      this.elements = [];
      return;
    }

    for(var key in options.data.feed.entry[0]){
      if(/^gsx/.test(key))
        this.column_names.push( key.replace("gsx$","") );
    }

    for(i = 0, ilen =  options.data.feed.entry.length ; i < ilen; i++) {
      var source = options.data.feed.entry[i];
      var element = {};
      for(var j = 0, jlen = this.column_names.length; j < jlen ; j++) {
        var cell = source[ "gsx$" + this.column_names[j] ];
        if (typeof(cell) !== 'undefined') {
          if(options.parseNumbers && cell.$t !== '' && !isNaN(cell.$t))
            element[ this.column_names[j] ] = +cell.$t;
          else
            element[ this.column_names[j] ] = cell.$t;
        } else {
            element[ this.column_names[j] ] = '';
        }
      }
      if(element.rowNumber === undefined)
        element.rowNumber = i + 1;
      if( options.postProcess )
        options.postProcess(element);
      this.elements.push(element);
    }

  };

  Tabletop.Model.prototype = {
    all: function() {
      return this.elements;
    },
    toArray: function() {
      var array = [],
          i, j, ilen, jlen;
      for(i = 0, ilen = this.elements.length; i < ilen; i++) {
        var row = [];
        for(j = 0, jlen = this.column_names.length; j < jlen ; j++) {
          row.push( this.elements[i][ this.column_names[j] ] );
        }
        array.push(row);
      }
      return array;
    }
  };

  if(inNodeJS) {
    module.exports = Tabletop;
  } else {
    global.Tabletop = Tabletop;
  }

})(this);


// function verifyLogin() {

// }


$(document).ready(function(){ 
    setTimeout(function(){ 
        $("div.title").fadeIn();}, 2000);
});

$(document).ready(function(){ 
    setTimeout(function(){ 
            $("div.login").fadeIn();}, 2000);   
});

$(document).ready(function(){
  $("#logobutton").click(function(){
    $("div.mission").toggle();
    $("div.calculatorpage").hide();
    $("div.profilepage").hide();
    $("div.newspage").hide();
    $("div.gamepage").hide();
    $("div.footer").hide();
    $("div.aboutuspage").hide();
    $("div.login").hide();
  });
});


$(document).ready(function(){
  $("#calculatorbutton").click(function(){
        $("div.mission").hide();
          $("div.calculatorpage").toggle();
          $("div.loading").remove()
          $("div.profilepage").hide();
          $("div.newspage").hide();
          $("div.gamepage").hide();
          $("div.footer").hide();
          $("div.aboutuspage").hide();
          $("div.login").hide();
          window.scrollTo(0,0);
        });
});

$(document).ready(function(){
  $("#profilebutton").click(function(){
            $("div.mission").hide();

          $("div.profilepage").toggle();
          $("div.loading").remove()
          $("div.calculatorpage").hide();
          $("div.newspage").hide();
          $("div.gamepage").hide();
          $("div.footer").hide();
          $("div.aboutuspage").hide();
          $("div.login").hide();
          window.scrollTo(0,0);
        });
});

$(document).ready(function(){
  $("#newsbutton").click(function(){
            $("div.mission").hide();

          $("div.newspage").toggle();
          $("div.loading").remove()
          $("div.calculatorpage").hide();
          $("div.gamepage").hide();
          $("div.profilepage").hide();
          $("div.footer").hide();
          $("div.aboutuspage").hide();
          $("div.login").hide();
          window.scrollTo(0,0);
        });
});

$(document).ready(function(){
  $("#gamebutton").click(function(){
            $("div.mission").hide();

        console.log("poop");
          $("div.newspage").hide();
          $("div.loading").remove()
          $("div.calculatorpage").hide();
          $("div.gamepage").toggle();
          $("div.profilepage").hide();
          $("div.footer").hide();
          $("div.aboutuspage").hide();
          $("div.login").hide();
          window.scrollTo(0,0);
        });
});

$(document).ready(function(){
  $("#aboutusbutton").click(function(){
            $("div.mission").hide();

          $("div.newspage").hide();
          $("div.loading").remove()
          $("div.calculatorpage").hide();
          $("div.gamepage").hide();
          $("div.profilepage").hide();
          $("div.footer").hide();
          $("div.aboutuspage").toggle();
          $("div.login").hide();
          window.scrollTo(0,0);
        });
});

$(document).ready(function() {
  $("#showerbutton").click(function() {

      $('html,body').animate({
          scrollTop: $(".shower").offset().top-215},
          'slow');
});
});

$(document).ready(function() {
  $("#toiletbutton").click(function() {
      $('html,body').animate({
          scrollTop: $(".toilet").offset().top-215},
          'slow');
});
});

$(document).ready(function() {
  $("#laundrybutton").click(function() {
      $('html,body').animate({
          scrollTop: $(".laundry").offset().top-215},
          'slow');
});
});

$(document).ready(function() {
  $("#dishwasherbutton").click(function() {
      $('html,body').animate({
          scrollTop: $(".dishwasher").offset().top-215},
          'slow');
});
});

$(document).ready(function() {
  $("#generalbutton").click(function() {
      $('html,body').animate({
          scrollTop: $(".general").offset().top-215},
          'slow');
});
});

$(document).ready(function() {
  $("#totalbutton").click(function() {
      $('html,body').animate({
          scrollTop: $(".total").offset().top},
          'slow');
});
});

$(document).ready(function() {
  $("div.newspage2").hide();
  $("div.newspage1").click(function() {
      $("div.newspage2").toggle();
});
});

$(document).ready(function() {
  $("div.legislation2").hide();
  $("div.legislation").click(function() {
      $("div.legislation2").toggle();
});
});

$(document).ready(function() {
  $("div.tips2").hide();
  $("div.tips").click(function() {
      $("div.tips2").toggle();
});
});

var s_inputValue = 0;
var t_inputValue = 0;
var l_inputValue = 0;
var d_inputValue = 0;
var g_inputValue = 0;

function s_outputUpdate(s_vol) {

document.querySelector('#s_volume').value = s_vol;
s_inputValue = s_vol;
}

function t_outputUpdate(t_vol) {

document.querySelector('#t_volume').value = t_vol;
t_inputValue = t_vol;
}

function l_outputUpdate(l_vol) {
  document.querySelector('#l_volume').value = l_vol;
  l_inputValue = l_vol;
}

function d_outputUpdate(d_vol) {
  document.querySelector('#d_volume').value = d_vol;
  d_inputValue = d_vol;
}

function g_outputUpdate(g_vol) {
  document.querySelector('#g_volume').value = g_vol;
  g_inputValue = g_vol;
}

function s_gallons(){
  document.getElementById("s").innerHTML = "You've used " + (s_inputValue*2).toFixed(2) + " gallons of water.";
  return s_inputValue;
}

function t_gallons(){
  document.getElementById("t").innerHTML = "You've used " + (t_inputValue*1.6).toFixed(2) + " gallons of water.";
}

function l_gallons(){
  document.getElementById("l").innerHTML = "You've used " + (l_inputValue*19.5).toFixed(2) + " gallons of water.";
}

function d_gallons(){
  document.getElementById("d").innerHTML = "You've used " + (d_inputValue*5.5).toFixed(2) + " gallons of water.";
}

function g_gallons(){
  document.getElementById("g").innerHTML = "You've used " + (g_inputValue*22.4).toFixed(2) + " gallons of water.";
}

var total = 0;

function total_gallons(){
  var total= (((s_inputValue*2)+(t_inputValue*1.6)+(l_inputValue*19.5)+(d_inputValue*5.5)+(g_inputValue*22.4))).toFixed(2);
  document.getElementById("tot").innerHTML = "You've used " + total + " gallons of water.";
  return total;
}

