/*
 * Copyright 2011, CircuitHub.com
 */
var mecha = mecha || {}; /* Redeclaring mecha is fine: behaves like a no-op (https://developer.mozilla.org/en/JavaScript/Reference/Scope_Cheatsheet) */

mecha.editor = 
(function() {

  "use strict";

  var create, exports, translateSugaredJS;

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
    domElement.innerHTML = "<span><input id='source-autocompile' name='source-autocompile' type='checkbox' disabled='disabled'><label for='source-autocompile'>Auto-compile</label></span>\n<input id='source-compile' name='source-compile' type='button' value='Compile'>\n<textarea id='source-code' name='source-code'>\n" + sourceCode + "\n</textarea>";
  };

  exports = exports != null ? exports : {};

  exports.create = create;

  return exports;

}).call(this);
