/*
 * Copyright 2011, CircuitHub.com
 */
var mecha = mecha || {};

mecha.editor = 
(function() {

  "use strict";

  var exports, translateSugaredJS;

  mecha.log = ((typeof console !== "undefined" && console !== null) && (console.log != null) ? function() {
    return console.log.apply(console, arguments);
  } : function() {});

  mecha.logInternalError = ((typeof console !== "undefined" && console !== null) && (console.log != null) ? function() {
    return console.log.apply(console, arguments);
  } : function() {});

  mecha.logApiError = ((typeof console !== "undefined" && console !== null) && (console.log != null) ? function() {
    return console.log.apply(console, arguments);
  } : function() {});

  translateSugaredJS = function(csmSourceCode) {
    return csmSourceCode;
  };

  exports = exports != null ? exports : {};

  return exports;

}).call(this);
