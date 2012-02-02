/*
 * Copyright 2011, CircuitHub.com
 */
var mecha = mecha || {}; /* Redeclaring mecha is fine: behaves like a no-op (https://developer.mozilla.org/en/JavaScript/Reference/Scope_Cheatsheet) */

mecha.editor = 
(function() {

  "use strict";

  var create, exports, getSourceCode, safeExport, safeTry, translateSugaredJS;

  mecha.log = ((typeof console !== "undefined" && console !== null) && (console.log != null) ? function() {
    return console.log.apply(console, arguments);
  } : function() {});

  mecha.logDebug = ((typeof mechaDebug !== "undefined" && mechaDebug !== null) && mechaDebug && (typeof console !== "undefined" && console !== null) && (console.log != null) ? function() {
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

  mecha.logException = function(locationName, error) {
    var logArgs;
    logArgs = ["Uncaught exception in `" + locationName + "`:\n"];
    logArgs.push((error.message != null ? "" + error.message + "\n" : error));
    if (error.stack != null) logArgs.push(error.stack);
    mecha.logInternalError.apply(mecha, logArgs);
    throw error;
  };

  safeExport = function(name, errorValue, callback) {
    return safeTry(name, callback, function(error) {
      mecha.logException(name, error);
      return errorValue;
    });
  };

  safeTry = function(name, callback, errorCallback) {
    if ((typeof mechaDebug !== "undefined" && mechaDebug !== null) && mechaDebug) {
      return callback;
    } else {
      return function() {
        try {
          return callback.apply(null, arguments);
        } catch (error) {
          return errorCallback(error);
        }
      };
    }
  };

  translateSugaredJS = function(csmSourceCode) {
    return csmSourceCode;
  };

  create = safeExport('mecha.editor.create', void 0, function(domElement, sourceCode) {
    if (!(sourceCode != null)) sourceCode = "";
    domElement.innerHTML = "<span><input id='mecha-source-autocompile' name='mecha-source-autocompile' type='checkbox' disabled='disabled'><label id='mecha-source-autocompile-label' for='mecha-source-autocompile'>Auto-compile</label></span>\n<input id='mecha-source-compile' name='mecha-source-compile' type='button' value='Compile'>\n<textarea id='mecha-source-code' name='mecha-source-code'>\n" + sourceCode + "\n</textarea>";
  });

  getSourceCode = safeExport('mecha.editor.getSourceCode', '', function() {
    return ($('#mecha-source-code')).val();
  });

  exports = exports != null ? exports : {};

  exports.create = create;

  exports.getSourceCode = getSourceCode;

  return exports;

}).call(this);
