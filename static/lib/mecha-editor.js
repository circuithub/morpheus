/*
 * Copyright 2011, CircuitHub.com
 */
var mecha = mecha || {}; /* Redeclaring mecha is fine: behaves like a no-op (https://developer.mozilla.org/en/JavaScript/Reference/Scope_Cheatsheet) */

mecha.editor = 
(function() {

  "use strict";

  var create, exports, getSourceCode, translateSugaredJS;

  mecha.log = ((typeof console !== "undefined" && console !== null) && (console.log != null) ? function() {
    return console.log.apply(console, arguments);
  } : function() {});

  mecha.logInternalError = ((typeof console !== "undefined" && console !== null) && (console.error != null) ? function() {
    return console.error.apply(console, arguments);
  } : function() {});

  mecha.logApiError = ((typeof console !== "undefined" && console !== null) && (console.error != null) ? function() {
    return console.error.apply(console, arguments);
  } : function() {});

  mecha.logApiWarning = ((typeof console !== "undefined" && console !== null) && (console.warn != null) ? function() {
    return console.warn.apply(console, arguments);
  } : function() {});

  translateSugaredJS = function(csmSourceCode) {
    return csmSourceCode;
  };

  create = function(domElement, sourceCode) {
    if (!(sourceCode != null)) sourceCode = "";
    domElement.innerHTML = "<span><input id='mecha-source-autocompile' name='mecha-source-autocompile' type='checkbox' disabled='disabled'><label id='mecha-source-autocompile-label' for='mecha-source-autocompile'>Auto-compile</label></span>\n<input id='mecha-source-compile' name='mecha-source-compile' type='button' value='Compile'>\n<textarea id='mecha-source-code' name='mecha-source-code'>\n" + sourceCode + "\n</textarea>";
  };

  getSourceCode = function() {
    return ($('#mecha-source-code')).val();
  };

  exports = exports != null ? exports : {};

  exports.create = create;

  exports.getSourceCode = getSourceCode;

  return exports;

}).call(this);
