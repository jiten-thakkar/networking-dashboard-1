const { Factory } = require('api-utils/xpcom');
const { Unknown } = require('api-utils/xpcom');
const {Cc,Ci,Cm,Cu,components} = require("chrome");
 
Cu.import("resource://gre/modules/XPCOMUtils.jsm");
Cu.import("resource://gre/modules/Services.jsm");
Cu.import("resource://gre/modules/AddonManager.jsm");

Cm.QueryInterface(Ci.nsIComponentRegistrar);

var self = require("self");
var timers = require("timers");
var dash = Cc['@mozilla.org/network/dashboard;1'].
    getService(Components.interfaces.nsIDashboard);

function dummy(mystr) {
  console.log(mystr);
}

function getData(worker) {
  dash.enableLogging = false;

  var totaldata = {};
  var count = 0;
  totaldata.http = {};
  totaldata.http = { host: [], port: [], spdy: [], ssl: [], active: [], idle: [] };
  totaldata.websocket = {hostport: [], encrypted: [], msgsent: [], msgreceived: [], sentsize: [], receivedsize: [] };
  totaldata.socket = {host: [], port: [], tcp: [], active: [], idle: [], socksent: [], sockreceived: [], sent: [], received: [] };
  totaldata.dns = {hostname: [], family: [], hostaddr: [], expiration: []};
  worker.port.emit('networking',totaldata);

  get();

  function get() {
    //totaldata = {}
    dash.requestSockets(getSocketData);
    dash.requestHttpConnections(getHttpData);
    dash.requestWebsocketConnections(getWebSocketData);
    dash.requestDNSInfo(getDnsData);

    function getSocketData(data) {
      totaldata.socket = data;
      count++;
      if (count==4)
        resetTimer();
    }

    function getHttpData(data) {
      totaldata.http = data;
      count++;
      if (count==4)
        resetTimer();
    }

    function getWebSocketData(data) {
      totaldata.websocket = data;
      count++;
      if (count==4)
        resetTimer();
      
    }

    function getDnsData(data) {
      totaldata.dns = data;
      count++;
      if (count==4)
        resetTimer();
    }

    function resetTimer() {
      count = 0;
      worker.port.emit('networking',totaldata);  
      var t=timers.setTimeout(get,5000);
    }    
  }
}
    
var pagemod = require("page-mod").PageMod({
    include: ['about:networking'],
    contentScriptFile: [self.data.url("jquery-1.8.0.min.js"), self.data.url("about_networking_dashboard.js"),
                        self.data.url("jquery.flot.min.js")],
    onAttach: function(worker) {
              getData(worker);
              worker.port.on('loggingPref', function(pref){
                dash.enableLogging = pref;
              });
    }
});

let netDash = Unknown.extend({
  QueryInterface: XPCOMUtils.generateQI([Ci.nsIAboutModule]),
  classDescription: "about:networking",
  classID: Components.ID("{b862ff39-b88f-4cf1-b82b-61b48f028f6a}"),
  contractID: "@mozilla.org/network/protocol/about;1?what=networking",
  
  newChannel: function(uri) {
    var ioService = Cc["@mozilla.org/network/io-service;1"].getService(Ci.nsIIOService);
    var html = 'data:text/html,<!DOCTYPE html><html><head><meta charset="UTF-8" />'
               +'<LINK href="'+self.data.url("stylesheet.css")+'" rel="stylesheet" type="text/css">'
               +'</head><body>'
               +'<div id="buttonDiv"></div>'
               +'<ul id="tabul">'
               +'</ul><div id="tabcontent" class="ui-content"></div>';
    html += "</body></html>";
    var channel = ioService.newChannel(html, null, null);
    var securityManager = Cc["@mozilla.org/scriptsecuritymanager;1"].getService(Ci.nsIScriptSecurityManager);
    var principal = securityManager.getSystemPrincipal(uri);
    channel.originalURI = uri;
    channel.owner = principal;
    return channel;
  },
 
  getURIFlags: function(uri) {
    return Ci.nsIAboutModule.URI_SAFE_FOR_UNTRUSTED_CONTENT;
  }
});

let namedFactory = Factory.new({
  contract: '@mozilla.org/network/protocol/about;1?what=networking',
  component: netDash
});

