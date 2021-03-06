/*
 * JSandbox worker v0.2.0.4
 * 2010-01-25
 * By Elijah Grey, http://eligrey.com
 * Licensed under the X11/MIT License
 *   See LICENSE.md
 */

// This file is requested every time a new sandbox is created.
// Make sure to include a Cache-Control header when serving this over HTTP.

/*global self */

/*jslint evil: true, undef: true, eqeqeq: true, immed: true */

/*! @source http://purl.eligrey.com/github/jsandbox/blob/master/src/jsandbox-worker.js*/

(function (self, globalEval) {
  "use strict";
  
  var
  postMessage   = self.postMessage,
  importScripts = self.importScripts,
  
  // modified json2.js that works in strict mode and stays private
  JSON          = self.JSON || {};
  (function(){function f(n){return n<10?"0"+n:n}if(typeof Date.prototype.toJSON!=="function"){Date.prototype.toJSON=function(key){return isFinite(this.valueOf())?this.getUTCFullYear()+"-"+f(this.getUTCMonth()+1)+"-"+f(this.getUTCDate())+"T"+f(this.getUTCHours())+":"+f(this.getUTCMinutes())+":"+f(this.getUTCSeconds())+"Z":null};String.prototype.toJSON=Number.prototype.toJSON=Boolean.prototype.toJSON=function(key){return this.valueOf()}}var cx=/[\u0000\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g,escapable=/[\\\"\x00-\x1f\x7f-\x9f\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g,gap,indent,meta={"\b":"\\b","\t":"\\t","\n":"\\n","\f":"\\f","\r":"\\r",'"':'\\"',"\\":"\\\\"},rep;function quote(string){escapable.lastIndex=0;return escapable.test(string)?'"'+string.replace(escapable,function(a){var c=meta[a];return typeof c==="string"?c:"\\u"+("0000"+a.charCodeAt(0).toString(16)).slice(-4)})+'"':'"'+string+'"'}function str(key,holder){var i,k,v,length,mind=gap,partial,value=holder[key];if(value&&typeof value==="object"&&typeof value.toJSON==="function"){value=value.toJSON(key)}if(typeof rep==="function"){value=rep.call(holder,key,value)}switch(typeof value){case"string":return quote(value);case"number":return isFinite(value)?String(value):"null";case"boolean":case"null":return String(value);case"object":if(!value){return"null"}gap+=indent;partial=[];if(Object.prototype.toString.apply(value)==="[object Array]"){length=value.length;for(i=0;i<length;i+=1){partial[i]=str(i,value)||"null"}v=partial.length===0?"[]":gap?"[\n"+gap+partial.join(",\n"+gap)+"\n"+mind+"]":"["+partial.join(",")+"]";gap=mind;return v}if(rep&&typeof rep==="object"){length=rep.length;for(i=0;i<length;i+=1){k=rep[i];if(typeof k==="string"){v=str(k,value);if(v){partial.push(quote(k)+(gap?": ":":")+v)}}}}else{for(k in value){if(Object.hasOwnProperty.call(value,k)){v=str(k,value);if(v){partial.push(quote(k)+(gap?": ":":")+v)}}}}v=partial.length===0?"{}":gap?"{\n"+gap+partial.join(",\n"+gap)+"\n"+mind+"}":"{"+partial.join(",")+"}";gap=mind;return v}}if(typeof JSON.stringify!=="function"){JSON.stringify=function(value,replacer,space){var i;gap="";indent="";if(typeof space==="number"){for(i=0;i<space;i+=1){indent+=" "}}else{if(typeof space==="string"){indent=space}}rep=replacer;if(replacer&&typeof replacer!=="function"&&(typeof replacer!=="object"||typeof replacer.length!=="number")){throw new Error("JSON.stringify")}return str("",{"":value})}}if(typeof JSON.parse!=="function"){JSON.parse=function(text,reviver){var j;function walk(holder,key){var k,v,value=holder[key];if(value&&typeof value==="object"){for(k in value){if(Object.hasOwnProperty.call(value,k)){v=walk(value,k);if(v!==undefined){value[k]=v}else{delete value[k]}}}}return reviver.call(holder,key,value)}cx.lastIndex=0;if(cx.test(text)){text=text.replace(cx,function(a){return"\\u"+("0000"+a.charCodeAt(0).toString(16)).slice(-4)})}if(/^[\],:{}\s]*$/.test(text.replace(/\\(?:["\\\/bfnrt]|u[0-9a-fA-F]{4})/g,"@").replace(/"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g,"]").replace(/(?:^|:|,)(?:\s*\[)+/g,""))){j=eval("("+text+")");return typeof reviver==="function"?walk({"":j},""):j}throw new SyntaxError("JSON.parse")}}}());
  
  // need to store JSON, JSON.parse and JSON.stringify in case they get changed
  var
  jsonParse         = JSON.parse,
  jsonStringify     = JSON.stringify,
  messageEventType  = "message",
  
  messageHandler = function (event) {
    var request = event.data,
    response = {};
    
    if (typeof request === "string") { // parse JSON
      request = jsonParse.call(JSON, request);
    }
    
    response.id = request.id;
    
    var data = request.data;
    self.input = request.input;
    
    try {
      switch (request.method) {
      
      case "eval": // JSLint has something against indenting cases
        response.results = globalEval(data);
        break;
      case "exec":
        importScripts("data:application/javascript," +
                      encodeURIComponent(data));
        break;
      case "load":
        importScripts.apply(self, data);
        break;
      
      }
    } catch (e) {
      response.error = e;
    }
    
    delete self.input;
    delete self.onmessage; // in case the code defined it
    
    try {
      // Attempt to use structured clone in browsers that support it
      postMessage(response);
    } catch (e) {
      if (e.code == 25) { // DOMException.DATA_CLONE_ERR (not available inside web workers)
        postMessage(jsonStringify(response));
      } else {
        throw(e);
      }
    }
  };
  
  if (self.addEventListener) {
    self.addEventListener(messageEventType, messageHandler, false);
  } else if (self.attachEvent) { // for future compatibility with IE
    self.attachEvent("on" + messageEventType, messageHandler);
  }
  
  self.window = self; // provide a window object for scripts
  
  // dereference unsafe functions
  // some might not be dereferenced: https://bugzilla.mozilla.org/show_bug.cgi?id=512464
  self.Worker              =
  self.addEventListener    = 
  self.removeEventListener =
  self.importScripts       =
  self.XMLHttpRequest      =
  self.postMessage         =
  //self.dispatchEvent       = (In firefox dispatchEvent is used internally by the browser - it cannot be dereferenced)
  // in case IE implements web workers
  self.attachEvent         =
  self.detachEvent         =
  self.ActiveXObject       =
  function(){};
  
}(self, eval));
