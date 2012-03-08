/*
 * Copyright 2011, CircuitHub.com
 */
var mecha = mecha || {}; /* Redeclaring mecha is fine: behaves like a no-op (https://developer.mozilla.org/en/JavaScript/Reference/Scope_Cheatsheet) */

mecha.generator = 
(function() {
  "use strict";
  var compileGLSL, flatten, gl, glsl, glslCompiler, glslCompilerDistance, glslLibrary, glslSceneDistance, glslSceneId, math_degToRad, math_invsqrt2, math_radToDeg, math_sqrt2, result, safeExport, safeTry, shallowClone, toStringPrototype;

  flatten = function(array) {
    var a, _ref;
    return (_ref = []).concat.apply(_ref, (function() {
      var _i, _len, _results;
      _results = [];
      for (_i = 0, _len = array.length; _i < _len; _i++) {
        a = array[_i];
        _results.push(Array.isArray(a) ? flatten(a) : [a]);
      }
      return _results;
    })());
  };

  shallowClone = function(array) {
    return array.slice(0);
  };

  math_sqrt2 = Math.sqrt(2.0);

  math_invsqrt2 = 1.0 / math_sqrt2;

  math_degToRad = Math.PI / 180.0;

  math_radToDeg = 180.0 / Math.PI;

  Math.clamp = function(s, min, max) {
    return Math.min(Math.max(s, min), max);
  };

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

  glsl = (function() {
    var api, isArrayType;
    isArrayType = function(a, typeString) {
      var element, _i, _len;
      for (_i = 0, _len = a.length; _i < _len; _i++) {
        element = a[_i];
        if (typeof element !== typeString) return false;
      }
      return true;
    };
    return api = {
      index: function(a, index) {
        if (Array.isArray(a)) {
          return a[index];
        } else {
          return "" + a + "[" + index + "]";
        }
      },
      floor: function(a) {
        var ai, _i, _len, _results;
        if ((Array.isArray(a)) && (isArrayType(a, 'number'))) {
          _results = [];
          for (_i = 0, _len = a.length; _i < _len; _i++) {
            ai = a[_i];
            _results.push(Math.floor(ai));
          }
          return _results;
        } else if (typeof a === 'number') {
          return Math.floor(a);
        } else {
          return "floor(" + (glsl.literal(a)) + ")";
        }
      },
      fract: function(a) {
        var ai, _i, _len, _results;
        if ((Array.isArray(a)) && (isArrayType(a, 'number'))) {
          _results = [];
          for (_i = 0, _len = a.length; _i < _len; _i++) {
            ai = a[_i];
            _results.push(ai - Math.floor(ai));
          }
          return _results;
        } else if (typeof a === 'number') {
          return a - Math.floor(a);
        } else {
          return "fract(" + (glsl.literal(a)) + ")";
        }
      },
      abs: function(a) {
        var ai, _i, _len, _results;
        if ((Array.isArray(a)) && (isArrayType(a, 'number'))) {
          _results = [];
          for (_i = 0, _len = a.length; _i < _len; _i++) {
            ai = a[_i];
            _results.push(Math.abs(ai));
          }
          return _results;
        } else if (typeof a === 'number') {
          return Math.abs(a);
        } else {
          return "abs(" + (glsl.literal(a)) + ")";
        }
      },
      cos: function(a) {
        if (typeof a === 'number') {
          return Math.cos(a);
        } else {
          return "cos(" + a + ")";
        }
      },
      sin: function(a) {
        if (typeof a === 'number') {
          return Math.sin(a);
        } else {
          return "sin(" + a + ")";
        }
      },
      dot: function(a, b) {
        var i, result, _ref;
        if (typeof a === 'string' || typeof b === 'string') {
          return "dot(" + a + ", " + b + ")";
        } else if ((Array.isArray(a)) && (Array.isArray(b))) {
          if (a.length !== b.length) {
            throw "Cannot perform dot product operation with array operands of different lengths.";
          }
          if (a.length < 2 || a.length > 4) {
            throw "Cannot perform dot product operation on vectors of " + a.length + " dimensions.";
          }
          if ((isArrayType(a, 'number')) && (isArrayType(b, 'number'))) {
            result = 0.0;
            for (i = 0, _ref = a.length; 0 <= _ref ? i < _ref : i > _ref; 0 <= _ref ? i++ : i--) {
              result += a[i] * b[i];
            }
            return result;
          } else {
            return "dot(" + (glsl.vecLit(a)) + ", " + (glsl.vecLit(b)) + ")";
          }
        } else {
          throw "Cannot perform dot product operation on operands with types '" + (typeof a) + "' and '" + (typeof b) + "'.";
        }
      },
      cross: function(a, b) {
        if (typeof a === 'string' || typeof b === 'string') {
          return "cross(" + a + ", " + b + ")";
        } else if ((Array.isArray(a)) && (Array.isArray(b))) {
          if (a.length !== b.length) {
            throw "Cannot perform cross product operation with array operands of different lengths.";
          }
          if (a.length !== 3) {
            throw "Cannot perform cross product operation on vectors of " + a.length + " dimensions.";
          }
          if ((isArrayType(a, 'number')) && (isArrayType(b, 'number'))) {
            return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
          } else {
            return "cross(" + (glsl.vec3Lit(a)) + ", " + (glsl.vec3Lit(b)) + ")";
          }
        } else {
          throw "Cannot perform cross operation on operands with types '" + (typeof a) + "' and '" + (typeof b) + "'.";
        }
      },
      length: function(a) {
        if (isArrayType(a, 'number')) {
          return Math.sqrt(glsl.dot(a, a));
        } else {
          return "length(" + (glsl.vecLit(axis)) + ")";
        }
      },
      mul: function(a, b) {
        var i, _ref, _results;
        if (typeof a === 'number' && typeof b === 'number') {
          return a * b;
        } else if (typeof a === 'number') {
          switch (a) {
            case 0:
              return 0;
            case 1:
              return b;
            case -1:
              return "-" + (glsl.literal(b));
            default:
              return "" + (glsl.floatLit(a)) + " * " + (glsl.literal(b));
          }
        } else if (typeof b === 'number') {
          switch (b) {
            case 0:
              return 0;
            case 1:
              return a;
            case -1:
              return "-" + (glsl.literal(a));
            default:
              return "" + (glsl.literal(a)) + " * " + (glsl.floatLit(b));
          }
        } else if ((Array.isArray(a)) && (Array.isArray(b))) {
          if (a.length !== b.length) {
            throw "Cannot perform multiply operation with array operands of different lengths.";
          }
          if ((isArrayType(a, 'number')) && (isArrayType(b, 'number'))) {
            _results = [];
            for (i = 0, _ref = a.length; 0 <= _ref ? i < _ref : i > _ref; 0 <= _ref ? i++ : i--) {
              _results.push(a[i] * b[i]);
            }
            return _results;
          } else {
            return "" + (glsl.vecLit(a)) + " * " + (glsl.vecLit(b));
          }
        } else {
          return "" + (glsl.literal(a)) + " * " + (glsl.literal(b));
        }
      },
      mod: function(a, b) {
        var i, _ref, _results;
        if (typeof a === 'number' && typeof b === 'number') {
          return a % b;
        } else if ((Array.isArray(a)) && (Array.isArray(b))) {
          if (a.length !== b.length) {
            throw "Cannot perform modulo operation with array operands of different lengths.";
          }
          if ((isArrayType(a, 'number')) && (isArrayType(b, 'number'))) {
            _results = [];
            for (i = 0, _ref = a.length; 0 <= _ref ? i < _ref : i > _ref; 0 <= _ref ? i++ : i--) {
              _results.push(a[i] % b[i]);
            }
            return _results;
          } else {
            return "mod(" + (glsl.vecLit(a)) + "," + (glsl.vecLit(b)) + ")";
          }
        } else if (typeof a === 'number') {
          switch (a) {
            case 0:
              return 0;
            default:
              return "mod(" + (glsl.floatLit(a)) + "," + (glsl.literal(b)) + ")";
          }
        } else if (typeof b === 'number') {
          switch (b) {
            case 0:
              return NaN;
            default:
              return "mod(" + (glsl.literal(a)) + "," + (glsl.floatLit(b)) + ")";
          }
        } else {
          return "mod(" + (glsl.literal(a)) + "," + (glsl.literal(b)) + ")";
        }
      },
      div: function(a, b) {
        var i, _ref, _results;
        if (typeof a === 'number' && typeof b === 'number') {
          return a / b;
        } else if (typeof a === 'number') {
          switch (a) {
            case 0:
              return 0;
            default:
              return "" + (glsl.floatLit(a)) + " / " + (glsl.literal(b));
          }
        } else if (typeof b === 'number') {
          switch (b) {
            case 0:
              return "" + (glsl.literal(a)) + " / 0.0";
            default:
              return "" + (glsl.literal(a)) + " / " + (glsl.floatLit(b));
          }
        } else if ((Array.isArray(a)) && (Array.isArray(b))) {
          if (a.length !== b.length) {
            throw "Cannot perform divide operation with array operands of different lengths.";
          }
          if ((isArrayType(a, 'number')) && (isArrayType(b, 'number'))) {
            _results = [];
            for (i = 0, _ref = a.length; 0 <= _ref ? i < _ref : i > _ref; 0 <= _ref ? i++ : i--) {
              _results.push(a[i] / b[i]);
            }
            return _results;
          } else {
            return "" + (glsl.vecLit(a)) + " / " + (glsl.vecLit(b));
          }
        } else {
          return "" + (glsl.literal(a)) + " / " + (glsl.literal(b));
        }
      },
      add: function(a, b) {
        var i, _ref, _results;
        if (typeof a === 'number' && typeof b === 'number') {
          return a + b;
        } else if (typeof a === 'number') {
          switch (a) {
            case 0:
              return b;
            default:
              return "" + (glsl.floatLit(a)) + " + " + (glsl.literal(b));
          }
        } else if (typeof b === 'number') {
          return glsl.add(b, a);
        } else if ((Array.isArray(a)) && (Array.isArray(b))) {
          if (a.length !== b.length) {
            throw "Cannot perform add operation with array operands of different lengths.";
          }
          if ((isArrayType(a, 'number')) && (isArrayType(b, 'number'))) {
            _results = [];
            for (i = 0, _ref = a.length; 0 <= _ref ? i < _ref : i > _ref; 0 <= _ref ? i++ : i--) {
              _results.push(a[i] + b[i]);
            }
            return _results;
          } else {
            return "" + (glsl.vecLit(a)) + " + " + (glsl.vecLit(b));
          }
        } else {
          return "" + (glsl.literal(a)) + " + " + (glsl.literal(b));
        }
      },
      sub: function(a, b) {
        var i, _ref, _results;
        if (typeof a === 'number' && typeof b === 'number') {
          return a - b;
        } else if (typeof a === 'number') {
          switch (a) {
            case 0:
              return glsl.neg(b);
            default:
              return "" + (glsl.floatLit(a)) + " - " + (glsl.literal(b));
          }
        } else if (typeof b === 'number') {
          switch (b) {
            case 0:
              return a;
            default:
              return "" + (glsl.literal(a)) + " - " + (glsl.floatLit(b));
          }
        } else if ((Array.isArray(a)) && (Array.isArray(b))) {
          if (a.length !== b.length) {
            throw "Cannot perform subtract operation with array operands of different lengths.";
          }
          if ((isArrayType(a, 'number')) && (isArrayType(b, 'number'))) {
            _results = [];
            for (i = 0, _ref = a.length; 0 <= _ref ? i < _ref : i > _ref; 0 <= _ref ? i++ : i--) {
              _results.push(a[i] - b[i]);
            }
            return _results;
          } else {
            return "" + (glsl.vecLit(a)) + " - " + (glsl.vecLit(b));
          }
        } else {
          return "" + (glsl.literal(a)) + " - " + (glsl.literal(b));
        }
      },
      neg: function(a) {
        var ai, _i, _len, _results;
        if (typeof a === 'number') {
          return -a;
        } else if ((Array.isArray(a)) && (isArrayType(a, 'number'))) {
          _results = [];
          for (_i = 0, _len = a.length; _i < _len; _i++) {
            ai = a[_i];
            _results.push(-ai);
          }
          return _results;
        } else {
          return "-" + (glsl.literal(a));
        }
      },
      min: function(a, b) {
        var i, _ref, _ref2, _ref3, _results;
        if ((typeof a === (_ref = typeof b) && _ref === 'number')) {
          return Math.min(a, b);
        } else if ((typeof a === (_ref2 = typeof b) && _ref2 === 'string')) {
          return "min(" + a + ", " + b + ")";
        } else if (typeof a === 'string') {
          return "min(" + a + ", " + (glsl.literal(b)) + ")";
        } else if (typeof b === 'string') {
          return "min(" + (glsl.literal(a)) + ", " + b + ")";
        } else if ((Array.isArray(a)) && (Array.isArray(b))) {
          if (a.length !== b.length) {
            throw "Cannot perform min operation with array operands of different lengths.";
          }
          if ((isArrayType(a, 'number')) && (isArrayType(b, 'number'))) {
            _results = [];
            for (i = 0, _ref3 = a.length; 0 <= _ref3 ? i < _ref3 : i > _ref3; 0 <= _ref3 ? i++ : i--) {
              _results.push(Math.min(a[i], b[i]));
            }
            return _results;
          } else {
            return "min(" + (glsl.vec3Lit(a)) + ", " + (glsl.vec3Lit(b)) + ")";
          }
        } else {
          throw "Operands passed to the min operation have incorrect types.";
        }
      },
      max: function(a, b) {
        var i, _ref, _ref2, _ref3, _results;
        if ((typeof a === (_ref = typeof b) && _ref === 'number')) {
          return Math.max(a, b);
        } else if ((typeof a === (_ref2 = typeof b) && _ref2 === 'string')) {
          return "max(" + a + ", " + b + ")";
        } else if (typeof a === 'string') {
          return "max(" + a + ", " + (glsl.literal(b)) + ")";
        } else if (typeof b === 'string') {
          return "max(" + (glsl.literal(a)) + ", " + b + ")";
        } else if ((Array.isArray(a)) && (Array.isArray(b))) {
          if (a.length !== b.length) {
            throw "Cannot perform operation with arrays of different lengths.";
          }
          if ((isArrayType(a, 'number')) && (isArrayType(b, 'number'))) {
            _results = [];
            for (i = 0, _ref3 = a.length; 0 <= _ref3 ? i < _ref3 : i > _ref3; 0 <= _ref3 ? i++ : i--) {
              _results.push(Math.max(a[i], b[i]));
            }
            return _results;
          } else {
            return "max(" + (glsl.vec3Lit(a)) + ", " + (glsl.vec3Lit(b)) + ")";
          }
        } else {
          throw "Operands passed to the max operation have incorrect types.";
        }
      },
      clamp: function(a, min, max) {
        var i, _ref, _ref2, _ref3, _ref4, _ref5, _results;
        if (((typeof a === (_ref2 = typeof min) && _ref2 === (_ref = typeof max)) && _ref === 'number')) {
          return Math.clamp(a, min, max);
        } else if (((typeof a === (_ref4 = typeof min) && _ref4 === (_ref3 = typeof max)) && _ref3 === 'string')) {
          return "clamp(" + a + ", " + min + ", " + max + ")";
        } else if ((Array.isArray(a)) && (Array.isArray(min)) && (Array.isArray(max))) {
          if (a.length !== b.length) {
            throw "Cannot perform clamp operation with array operands of different lengths.";
          }
          if ((isArrayType(a, 'number')) && (isArrayType(min, 'number')) && (isArrayType(max, 'number'))) {
            _results = [];
            for (i = 0, _ref5 = a.length; 0 <= _ref5 ? i < _ref5 : i > _ref5; 0 <= _ref5 ? i++ : i--) {
              _results.push(Math.clamp(a[i], min[i], max[i]));
            }
            return _results;
          } else {
            return "clamp(" + (glsl.vec3Lit(a)) + ", " + (glsl.vec3Lit(min)) + ", " + (glsl.vec3Lit(max)) + ")";
          }
        } else {
          return "clamp(" + (typeof a === 'string' ? a : glsl.literal(a)) + ", " + (typeof min === 'string' ? min : glsl.literal(min)) + ", " + (typeof max === 'string' ? max : glsl.literal(max)) + ")";
        }
      },
      mini: function(a, b) {
        var i, _ref, _ref2, _ref3, _results;
        if ((typeof a === (_ref = typeof b) && _ref === 'number')) {
          return Math.min(a, b);
        } else if ((typeof a === (_ref2 = typeof b) && _ref2 === 'string')) {
          return "min(" + a + ", " + b + ")";
        } else if (typeof a === 'string' || typeof b === 'string') {
          return "max(" + a + ", " + b + ")";
        } else if ((Array.isArray(a)) && (Array.isArray(b))) {
          if (a.length !== b.length) {
            throw "Cannot perform operation with arrays of different lengths.";
          }
          if ((isArrayType(a, 'number')) && (isArrayType(b, 'number'))) {
            _results = [];
            for (i = 0, _ref3 = a.length; 0 <= _ref3 ? i < _ref3 : i > _ref3; 0 <= _ref3 ? i++ : i--) {
              _results.push(Math.max(a[i], b[i]));
            }
            return _results;
          } else {
            return "max(vec3(" + a + "), vec3(" + b + "))";
          }
        } else {
          throw "Operands passed to the max operation have incorrect types.";
        }
      },
      maxi: function(a, b) {
        var i, _ref, _ref2, _ref3, _results;
        if ((typeof a === (_ref = typeof b) && _ref === 'number')) {
          return Math.max(a, b);
        } else if ((typeof a === (_ref2 = typeof b) && _ref2 === 'string')) {
          return "max(" + a + ", " + b + ")";
        } else if (typeof a === 'string' || typeof b === 'string') {
          return "max(" + a + ", " + b + ")";
        } else if ((Array.isArray(a)) && (Array.isArray(b))) {
          if (a.length !== b.length) {
            throw "Cannot perform operation with arrays of different lengths.";
          }
          if ((isArrayType(a, 'number')) && (isArrayType(b, 'number'))) {
            _results = [];
            for (i = 0, _ref3 = a.length; 0 <= _ref3 ? i < _ref3 : i > _ref3; 0 <= _ref3 ? i++ : i--) {
              _results.push(Math.max(a[i], b[i]));
            }
            return _results;
          } else {
            return "max(vec3(" + a + "), vec3(" + b + "))";
          }
        } else {
          throw "Operands passed to the max operation have incorrect types.";
        }
      },
      literal: function(a) {
        if (typeof a === 'number') {
          return glsl.floatLit(a);
        } else if (Array.isArray(a)) {
          return glsl.vecLit(a);
        } else {
          return "(" + a + ")";
        }
      },
      floatLit: function(a) {
        if (typeof a === 'number' && (a | 0) === a) {
          return a + '.0';
        } else {
          return "(" + a + ")";
        }
      },
      vecLit: function(a) {
        if (a.length > 1 && a.length < 5) {
          return glsl["vec" + a.length + "Lit"](a);
        } else {
          throw "Cannot create vector literal with length " + a.length + ".";
        }
      },
      vec2Lit: function(a) {
        if (typeof a === 'number') {
          return "vec2(" + (glsl.floatLit(a)) + ")";
        } else if (Array.isArray(a)) {
          return "vec2(" + (glsl.floatLit(a[0])) + "," + (glsl.floatLit(a[1])) + ")";
        } else {
          return "(" + a + ")";
        }
      },
      vec3Lit: function(a) {
        if (typeof a === 'number') {
          return "vec3(" + (glsl.floatLit(a)) + ")";
        } else if (Array.isArray(a)) {
          return "vec3(" + (glsl.floatLit(a[0])) + "," + (glsl.floatLit(a[1])) + "," + (glsl.floatLit(a[2])) + ")";
        } else {
          return "(" + a + ")";
        }
      },
      vec4Lit: function(a) {
        if (typeof a === 'number') {
          return "vec4(" + (glsl.floatLit(a)) + ")";
        } else if (Array.isArray(a)) {
          return "vec4(" + (glsl.floatLit(a[0])) + "," + (glsl.floatLit(a[1])) + "," + (glsl.floatLit(a[2])) + "," + (glsl.floatLit(a[3])) + ")";
        } else {
          return "(" + a + ")";
        }
      },
      axisRotation: function(axis, angle) {
        if ((isArrayType(axis, 'number')) && (typeof angle === 'number')) {
          return gl.matrix3.newAxisRotation(axis, angle);
        }
        return mecha.logInternalError("axisRotation is not yet implemented in the GLSL API.");
        /*
              # TODO: This can (should) probably be optimized a lot...
              # Convert rotation to quaternion representation
              length = glsl.length axis
              halfAngle = glsl.mul angle, 0.5
              sinHalfOverLength = glsl.div (glsl.sin halfAngle), length
              xyz = glsl.mul axis, sinHalfOverLength
              x = glsl.index xyz, 0
              y = glsl.index xyz, 1
              z = glsl.index xyz, 2
              w = glsl.cos halfAngle
              # Convert quaternion to matrix representation       
              xx = glsl.mul x, x
              xy = glsl.mul x, y
              xz = glsl.mul x, z
              xw = glsl.mul x, w
              yy = glsl.mul y, y
              yz = glsl.mul y, z
              yw = glsl.mul y, w
              zz = glsl.mul z, z
              zw = glsl.mul z, w
              return [
                (glsl.sub 1, (glsl.mul 2, (glsl.add yy, zz))), (glsl.mul 2, (glsl.add xy, zw)),               (glsl.mul 2, (glsl.sub xz, yw)),
                (glsl.mul 2, (glsl.sub xy, zw)),               (glsl.sub 1, (glsl.mul 2, (glsl.add xx, zz))), (glsl.mul 2, (glsl.add yz, xw)),
                (glsl.mul 2, (glsl.add xz, yw)),               (glsl.mul 2, (glsl.sub yz, xw)),               (glsl.sub 1, (glsl.mul 2, (glsl.mul xx, yy)))
              ]
        */
      }
    };
  })();

  gl = glQueryMath;

  toStringPrototype = (function() {

    function toStringPrototype(str) {
      this.str = str;
    }

    toStringPrototype.prototype.toString = function() {
      return this.str;
    };

    return toStringPrototype;

  })();

  glslLibrary = {
    distanceFunctions: {
      boxChamferDist: {
        id: '_boxChamferDist',
        returnType: 'float',
        arguments: ['vec3', 'vec3', 'vec3', 'float'],
        code: (function() {
          var center, chamferCenter, chamferDist, chamferDistLength, chamferRadius, dist, gtChamferCenter, position, radius, rel;
          position = 'a';
          center = 'b';
          radius = 'c';
          chamferRadius = 'd';
          rel = 'r';
          dist = 's';
          chamferCenter = 'cc';
          chamferDist = 'ccd';
          chamferDistLength = 'ccdl';
          gtChamferCenter = 'gtcc';
          return ["vec3 " + rel + " = abs(" + position + " - " + center + ");", "vec3 " + dist + " = max(vec3(0.0), " + rel + " - " + center + ");", "if (any(greaterThan(" + rel + ", " + center + " + vec3(" + chamferRadius + ")))) { return max(max(" + dist + ".x, " + dist + ".y), " + dist + ".z); }", "vec3 " + chamferCenter + " = " + radius + " - vec3(" + chamferRadius + ");", "bvec3 " + gtChamferCenter + " = greaterThan(" + rel + ", " + chamferCenter + ");", "if (!any(" + gtChamferCenter + ")) { return 0.0; }", "vec3 " + chamferDist + " = " + rel + " - " + chamferCenter + ";", "if (min(" + chamferDist + ".x, " + chamferDist + ".y) < 0.0 && min(" + chamferDist + ".x, " + chamferDist + ".z) < 0.0 && min(" + chamferDist + ".y, " + chamferDist + ".z) < 0.0)", "{ return max(max(" + dist + ".x, " + dist + ".y), " + dist + ".z); }", "float " + chamferDistLength + ";", "if (all(" + gtChamferCenter + ")) {", "  " + chamferDistLength + " = length(" + chamferDist + ");", "}", "else if(" + chamferDist + ".x < 0.0) {", "  " + chamferDistLength + " = length(" + chamferDist + ".yz);", "}", "else if (" + chamferDist + ".y < 0.0) {", "  " + chamferDistLength + " = length(" + chamferDist + ".xz);", "}", "else { // " + chamferDist + ".z < 0.0", "  " + chamferDistLength + " = length(" + chamferDist + ".xy);", "}", "return min(" + chamferDistLength + " - " + chamferRadius + ", 0.0);"];
        })()
      }
    },
    compile: function(libraryFunctions) {
      var argCharCode, argName, c, charCodeA, code, distanceFunction, f, i, v, _i, _len, _ref, _ref2;
      code = "";
      for (f in libraryFunctions) {
        v = libraryFunctions[f];
        distanceFunction = this.distanceFunctions[f + 'Dist'];
        if (!distanceFunction) {
          mecha.log("GLSL distance function '" + f + "Dist' could not be found.");
          continue;
        }
        code += '\n';
        code += "" + distanceFunction.returnType + " " + distanceFunction.id + "(";
        charCodeA = 'a'.charCodeAt(0);
        for (i = 0, _ref = distanceFunction.arguments.length; 0 <= _ref ? i < _ref : i > _ref; 0 <= _ref ? i++ : i--) {
          argCharCode = charCodeA + i;
          argName = String.fromCharCode(argCharCode);
          code += "in " + distanceFunction.arguments[i] + " " + argName;
          if (i < distanceFunction.arguments.length - 1) code += ',';
        }
        code += ") {\n";
        _ref2 = distanceFunction.code;
        for (_i = 0, _len = _ref2.length; _i < _len; _i++) {
          c = _ref2[_i];
          code += c + '\n';
        }
        code += "}\n";
      }
      return code;
    }
  };

  glslCompiler = function(abstractSolidModel, preDispatch, postDispatch) {
    var flags, rayOrigin, result;
    if (!(abstractSolidModel != null)) return;
    rayOrigin = 'ro';
    flags = {
      invert: false,
      glslFunctions: {},
      glslPrelude: [['ro', "" + rayOrigin]],
      materials: [],
      materialIdStack: [-1],
      composition: [glslCompiler.COMPOSITION_UNION]
    };
    flags.glslPrelude.code = "";
    flags.glslPrelude.counter = 0;
    result = mecha.compiler.mapASM(preDispatch, postDispatch, [
      {
        nodes: []
      }
    ], abstractSolidModel, flags);
    result.flags = flags;
    return result;
  };

  glslCompiler.COMPOSITION_UNION = 0;

  glslCompiler.COMPOSITION_INTERSECT = 1;

  glslCompiler.preludePush = function(prelude, value, valueType) {
    var name;
    name = 'r' + prelude.counter;
    prelude.counter += 1;
    prelude.code += "  " + (valueType != null ? valueType : 'vec3') + " " + name + " = " + value + ";\n";
    prelude.push([name, value]);
    return name;
  };

  glslCompiler.preludePop = function(prelude) {
    return prelude.pop()[0];
  };

  glslCompiler.preludeTop = function(prelude) {
    if (!Array.isArray(prelude || prelude.length === 0)) {
      throw "Could not retrieve top value from prelude.";
    }
    return prelude[prelude.length - 1][0];
  };

  glslCompiler.preludeAdd = function(prelude, value, valueType) {
    var name;
    name = 'r' + prelude.counter;
    prelude.counter += 1;
    prelude.code += "  " + (valueType != null ? valueType : 'vec3') + " " + name + " = " + value + ";\n";
    return name;
  };

  glslCompilerDistance = function(primitiveCallback, minCallback, maxCallback, modifyCallback) {
    var compileCompositeNode, postDispatch, preDispatch, rayOrigin;
    rayOrigin = 'ro';
    preDispatch = {
      invert: function(stack, node, flags) {
        flags.invert = !flags.invert;
      },
      union: function(stack, node, flags) {
        var i;
        flags.composition.push(glslCompiler.COMPOSITION_UNION);
        node.halfSpaces = [];
        for (i = 0; i <= 5; i++) {
          node.halfSpaces.push(null);
        }
      },
      intersect: function(stack, node, flags) {
        var i;
        flags.composition.push(glslCompiler.COMPOSITION_INTERSECT);
        node.halfSpaces = [];
        for (i = 0; i <= 5; i++) {
          node.halfSpaces.push(null);
        }
      },
      chamfer: function(stack, node, flags) {},
      bevel: function(stack, node, flags) {},
      translate: function(stack, node, flags) {
        var ro;
        ro = glslCompiler.preludeTop(flags.glslPrelude);
        glslCompiler.preludePush(flags.glslPrelude, "" + ro + " - vec3(" + node.attr.offset + ")");
      },
      rotate: function(stack, node, flags) {
        var components, cosAngle, mat, ro, sinAngle;
        ro = glslCompiler.preludeTop(flags.glslPrelude);
        if (Array.isArray(node.attr.axis)) {
          mat = glsl.axisRotation(node.attr.axis, glsl.mul(glsl.neg(math_degToRad), node.attr.angle));
          glslCompiler.preludePush(flags.glslPrelude, "mat3(" + mat + ") * " + ro);
        } else {
          cosAngle = glsl.cos(glsl.mul(-math_degToRad, node.attr.angle));
          sinAngle = glsl.sin(glsl.mul(-math_degToRad, node.attr.angle));
          components = [
            (function() {
              switch (node.attr.axis) {
                case 0:
                  return "" + ro + ".x";
                case 1:
                  return "" + (glsl.add(glsl.mul(cosAngle, ro + '.x'), glsl.mul(sinAngle, ro + '.z')));
                default:
                  return "" + (glsl.add(glsl.mul(cosAngle, ro + '.x'), glsl.mul(glsl.neg(sinAngle), ro + '.y')));
              }
            })(), (function() {
              switch (node.attr.axis) {
                case 0:
                  return "" + (glsl.add(glsl.mul(cosAngle, ro + '.y'), glsl.mul(glsl.neg(sinAngle), ro + '.z')));
                case 1:
                  return "" + ro + ".y";
                default:
                  return "" + (glsl.add(glsl.mul(sinAngle, ro + '.x'), glsl.mul(cosAngle, ro + '.y')));
              }
            })(), (function() {
              switch (node.attr.axis) {
                case 0:
                  return "" + (glsl.add(glsl.mul(sinAngle, ro + '.y'), glsl.mul(cosAngle, ro + '.z')));
                case 1:
                  return "" + (glsl.add(glsl.mul(glsl.neg(sinAngle), ro + '.x'), glsl.mul(cosAngle, ro + '.z')));
                default:
                  return "" + ro + ".z";
              }
            })()
          ];
          glslCompiler.preludePush(flags.glslPrelude, "vec3(" + components + ")");
        }
      },
      scale: function(stack, node, flags) {
        var i, ro;
        node.halfSpaces = [];
        for (i = 0; i <= 5; i++) {
          node.halfSpaces.push(null);
        }
        ro = glslCompiler.preludeTop(flags.glslPrelude);
        if (Array.isArray(node.attr.factor)) {
          mecha.logInternalError("GLSL Compiler: Scale along multiple axes are not yet supported.");
        } else {
          glslCompiler.preludePush(flags.glslPrelude, glsl.div(ro, node.attr.factor));
        }
      },
      mirror: function(stack, node, flags) {
        var a, axes, axesCodes, i, ro, _i, _len, _ref;
        ro = glslCompiler.preludeTop(flags.glslPrelude);
        axes = [false, false, false];
        _ref = node.attr.axes;
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          a = _ref[_i];
          axes[a] = true;
        }
        if (axes[0] && axes[1] && axes[2]) {
          glslCompiler.preludePush(flags.glslPrelude, "abs(" + ro + ")");
        } else {
          axesCodes = (function() {
            var _results;
            _results = [];
            for (i = 0; i <= 2; i++) {
              _results.push(axes[i] ? "abs(" + ro + "[" + i + "])" : "" + ro + "[" + i + "]");
            }
            return _results;
          })();
          glslCompiler.preludePush(flags.glslPrelude, "vec3(" + axesCodes + ")");
        }
      },
      repeat: function(stack, node, flags) {
        var cell, cellClamp, cellClampInterval, cellFloor, cellMax, cellMin, halfCells, halfInterval, halfParity, interval, parity, preludeVar, ro, roSubParity;
        ro = glslCompiler.preludeTop(flags.glslPrelude);
        if (!(node.attr.count != null)) {
          interval = glslCompiler.preludeAdd(flags.glslPrelude, glsl.vec3Lit(node.attr.interval), 'vec3');
          halfInterval = glslCompiler.preludeAdd(flags.glslPrelude, glsl.mul(0.5, interval), 'vec3');
          glslCompiler.preludePush(flags.glslPrelude, "mod(abs(" + ro + " + " + halfInterval + "), " + interval + ")}");
        } else {
          preludeVar = function(a, type) {
            return glslCompiler.preludeAdd(flags.glslPrelude, a, type);
          };
          interval = preludeVar(glsl.vec3Lit(node.attr.interval), 'vec3');
          halfInterval = preludeVar(glsl.mul(0.5, interval), 'vec3');
          parity = preludeVar(glsl.mod(node.attr.count, "vec3(2.0)"));
          halfParity = preludeVar(glsl.mul(0.5, parity));
          roSubParity = glsl.sub(ro, glsl.mul(halfParity, interval));
          cell = preludeVar(glsl.div(roSubParity, interval));
          cellFloor = preludeVar(glsl.floor(cell));
          halfCells = glsl.mul(node.attr.count, 0.5);
          cellMin = preludeVar(glsl.sub(glsl.neg(halfCells), halfParity));
          cellMax = preludeVar(glsl.sub(glsl.sub(halfCells, halfParity), "vec3(1.0)"));
          cellClamp = glsl.clamp(cellFloor, cellMin, cellMax);
          cellClampInterval = glsl.mul(cellClamp, interval);
          glslCompiler.preludePush(flags.glslPrelude, glsl.sub(glsl.sub(roSubParity, cellClampInterval), halfInterval));
        }
      },
      material: function(stack, node, flags) {
        flags.materialIdStack.push(flags.materials.length);
        flags.materials.push("vec3(" + node.attr.color + ")");
      },
      "default": function(stack, node, flags) {}
    };
    /*
    
      # TODO: This is overly complex and broken... need a better optimization method for corners....
      # (Perhaps one that lets the GLSL compiler precompute operations between uniforms (e.g. glsl.min(param0, param1)
    
      compileCorner = (ro, flags, state, chamferRadius, bevelRadius) ->
        remainingHalfSpaces = 0
        remainingHalfSpaces += 1 for h in state.hs when h != null
    
        #if remainingHalfSpaces == 1
        #  # Find the axis (from 0 to 5) for the halfSpace node
        #  for index in [0..5] when state.hs[index] != null
        #    state.codes.push primitiveCallback (if index > 2 then "#{ro}[#{index - 3}] - #{state.hs[index]}" else "-#{ro}[#{index}] + #{state.hs[index]}"), flags
        #    state.hs[index] = null
        #    break
        #  remainingHalfSpaces -= 1
        #else if remainingHalfSpaces > 1
        if remainingHalfSpaces > 0
          cornerSpaces = 0
          cornerSpaces += 1 if state.hs[0] != null or state.hs[3] != null
          cornerSpaces += 1 if state.hs[1] != null or state.hs[4] != null
          cornerSpaces += 1 if state.hs[2] != null or state.hs[5] != null
          chamferRadius = 0 if cornerSpaces == 1 or bevelRadius != 0
          cornerSize = [
            if state.hs[0] != null then (glsl.sub state.hs[0], radius) else if state.hs[3] != null then (glsl.sub radius, state.hs[3]) else 0, #TODO: zero for cornersize might be the wrong choice... (possibly something large instead?)
            if state.hs[1] != null then (glsl.sub state.hs[1], radius) else if state.hs[4] != null then (glsl.sub radius, state.hs[4]) else 0,
            if state.hs[2] != null then (glsl.sub state.hs[2], radius) else if state.hs[5] != null then (glsl.sub radius, state.hs[5]) else 0]
          signs = [
            state.hs[0] == null and state.hs[3] != null,
            state.hs[1] == null and state.hs[4] != null,
            state.hs[2] == null and state.hs[5] != null]
          roComponents  = [
            if signs[0] then "-#{ro}.x" else "#{ro}.x", 
            if signs[1] then "-#{ro}.y" else "#{ro}.y", 
            if signs[2] then "-#{ro}.z" else "#{ro}.z"]
          roWithSigns = 
            if not (signs[0] or signs[1] or signs[2])
              "#{ro}"
            else if (signs[0] or state.hs[3] == null) and (signs[1] or state.hs[4] == null) and (signs[2] or state.hs[5] == null)
              "-#{ro}"
            else
              glslCompiler.preludeAdd flags.glslPrelude, "vec3(#{roComponents[0]}, #{roComponents[1]}, #{roComponents[2]})"
          cornerWithSigns = glsl.vec3Lit cornerSize
          dist = glslCompiler.preludeAdd flags.glslPrelude, "#{roWithSigns} - #{glsl.vec3Lit cornerSize}"
    
          # Special cases
          if cornerSpaces > 1
            if radius > 0
              state.codes.push primitiveCallback "length(max(#{dist}, 0.0)) - #{radius}", flags
            else if bevelRadius > 0
              axisCombinations = []
              axisCombinations.push 0 if state.hs[0] != null or state.hs[3] != null
              axisCombinations.push 1 if state.hs[1] != null or state.hs[4] != null
              axisCombinations.push 2 if state.hs[2] != null or state.hs[5] != null
              # TODO: assert(axisCombinations.length >= 2)
              glslCompiler.preludePush flags.glslPrelude, "#{roComponents[axisCombinations[0]]} + #{roComponents[axisCombinations[1]]} - #{cornerSize[axisCombinations[0]] + cornerSize[axisCombinations[1]] - bevelRadius}", "float"
              if axisCombinations.length == 3
                glslCompiler.preludePush flags.glslPrelude, "#{roComponents[axisCombinations[0]]} + #{roComponents[axisCombinations[2]]} - #{cornerSize[axisCombinations[0]] + cornerSize[axisCombinations[2]] - bevelRadius}", "float"
                glslCompiler.preludePush flags.glslPrelude, "#{roComponents[axisCombinations[1]]} + #{roComponents[axisCombinations[2]]} - #{cornerSize[axisCombinations[1]] + cornerSize[axisCombinations[2]] - bevelRadius}", "float"
              switch axisCombinations.length
                when 2
                  state.codes.push primitiveCallback "max(length(max(#{dist}, 0.0)), #{math_invsqrt2} * #{glslCompiler.preludePop flags.glslPrelude})", flags
                when 3
                  state.codes.push primitiveCallback "max(max(max(length(max(#{dist}, 0.0)), #{math_invsqrt2} * #{glslCompiler.preludePop flags.glslPrelude}), #{math_invsqrt2} * #{glslCompiler.preludePop flags.glslPrelude}), #{math_invsqrt2} * #{glslCompiler.preludePop flags.glslPrelude})", flags
            else # bevelRadius == chamferRadius == 0
              state.codes.push primitiveCallback "length(max(#{dist}, 0.0))", flags
            if state.hs[0] != null or state.hs[3] != null
              if state.hs[0] != null then state.hs[0] = null else state.hs[3] = null
            if state.hs[1] != null or state.hs[4] != null
              if state.hs[1] != null then state.hs[1] = null else state.hs[4] = null
            if state.hs[2] != null or state.hs[5] != null
              if state.hs[2] != null then state.hs[2] = null else state.hs[5] = null
            remainingHalfSpaces -= cornerSpaces
          else
            # General cases
            if state.hs[0] != null or state.hs[3] != null
              state.codes.push primitiveCallback "#{dist}.x", flags
              if state.hs[0] != null then state.hs[0] = null else state.hs[3] = null
            else if state.hs[1] != null or state.hs[4] != null
              state.codes.push primitiveCallback "#{dist}.y", flags
              if state.hs[1] != null then state.hs[1] = null else state.hs[4] = null
            else if state.hs[2] != null or state.hs[5] != null
              state.codes.push primitiveCallback "#{dist}.z", flags
              if state.hs[2] != null then state.hs[2] = null else state.hs[5] = null
            remainingHalfSpaces -= 1
        return
    */
    compileCompositeNode = function(name, cmpCallback, stack, node, flags) {
      var bevelRadius, c, chamferRadius, codes, collectCode, cornersState, h, ro, s, _i, _j, _k, _len, _len2, _len3, _ref;
      if (node.nodes.length === 0) return;
      codes = [];
      collectCode = function(codes, nodes) {
        var node, _i, _len;
        for (_i = 0, _len = nodes.length; _i < _len; _i++) {
          node = nodes[_i];
          if (node.code != null) codes.push(node.code);
          switch (node.type) {
            case 'translate':
            case 'rotate':
            case 'mirror':
            case 'repeat':
            case 'invert':
            case 'material':
            case 'chamfer':
            case 'bevel':
              collectCode(codes, node.nodes);
          }
        }
      };
      collectCode(codes, node.nodes);
      ro = glslCompiler.preludeTop(flags.glslPrelude);
      cornersState = {
        codes: [],
        hs: shallowClone(node.halfSpaces)
      };
      chamferRadius = 0;
      bevelRadius = 0;
      for (_i = 0, _len = stack.length; _i < _len; _i++) {
        s = stack[_i];
        switch (s.type) {
          case 'chamfer':
            chamferRadius = s.attr.radius;
            break;
          case 'bevel':
            bevelRadius = s.attr.radius;
            break;
          case 'translate':
          case 'rotate':
          case 'scale':
          case 'invert':
          case 'mirror':
          case 'repeat':
            continue;
        }
        break;
      }
      /* Compile the first and a possible second corner
      compileCorner ro, flags, cornersState, chamferRadius, bevelRadius
      compileCorner ro, flags, cornersState, chamferRadius, bevelRadius
      codes = codes.concat cornersState.codes
      #
      */
      _ref = cornersState.hs;
      for (_j = 0, _len2 = _ref.length; _j < _len2; _j++) {
        h = _ref[_j];
        if (!(h !== null)) continue;
        mecha.logInternalError("GLSL Compiler: Post-condition failed, some half spaces were not processed during corner compilation.");
        break;
      }
      node.code = codes.shift();
      for (_k = 0, _len3 = codes.length; _k < _len3; _k++) {
        c = codes[_k];
        node.code = cmpCallback(c, node.code, flags);
      }
    };
    postDispatch = {
      invert: function(stack, node, flags) {
        flags.invert = !flags.invert;
        return stack[0].nodes.push(node);
      },
      union: function(stack, node, flags) {
        flags.composition.pop();
        compileCompositeNode('Union', (!flags.invert ? minCallback : maxCallback), stack, node, flags);
        return stack[0].nodes.push(node);
      },
      intersect: function(stack, node, flags) {
        flags.composition.pop();
        compileCompositeNode('Intersect', (!flags.invert ? maxCallback : minCallback), stack, node, flags);
        return stack[0].nodes.push(node);
      },
      chamfer: function(stack, node, flags) {
        return stack[0].nodes.push(node);
      },
      bevel: function(stack, node, flags) {
        return stack[0].nodes.push(node);
      },
      translate: function(stack, node, flags) {
        glslCompiler.preludePop(flags.glslPrelude);
        if (node.nodes.length === 0) {
          mecha.logInternalError("GLSL Compiler: Translate node is empty.");
          return;
        }
        return stack[0].nodes.push(node);
      },
      rotate: function(stack, node, flags) {
        glslCompiler.preludePop(flags.glslPrelude);
        if (node.nodes.length === 0) {
          mecha.logInternalError("GLSL Compiler: Rotate node is empty.");
          return;
        }
        return stack[0].nodes.push(node);
      },
      scale: function(stack, node, flags) {
        if (flags.composition[flags.composition.length - 1] === glslCompiler.COMPOSITION_UNION) {
          compileCompositeNode('Scale', minCallback, stack, node, flags);
        } else if (flags.composition[flags.composition.length - 1] === glslCompiler.COMPOSITION_INTERSECT) {
          compileCompositeNode('Scale', maxCallback, stack, node, flags);
        }
        if (!Array.isArray(node.attr.factor)) {
          node.code = modifyCallback(node.code, glsl.mul("(" + node.code + ")", node.attr.factor));
        }
        glslCompiler.preludePop(flags.glslPrelude);
        return stack[0].nodes.push(node);
      },
      mirror: function(stack, node, flags) {
        glslCompiler.preludePop(flags.glslPrelude);
        return stack[0].nodes.push(node);
      },
      repeat: function(stack, node, flags) {
        glslCompiler.preludePop(flags.glslPrelude);
        return stack[0].nodes.push(node);
      },
      halfspace: function(stack, node, flags) {
        var ro;
        if (node.nodes.length !== 0) {
          mecha.logInternalError("GLSL Compiler: Halfspace node is not empty.");
          return;
        }
        ro = glslCompiler.preludeTop(flags.glslPrelude);
        if (flags.invert) {
          node.code = primitiveCallback(glsl.sub(node.attr.val, "" + ro + "[" + node.attr.axis + "]"), flags);
        } else {
          node.code = primitiveCallback(glsl.sub("" + ro + "[" + node.attr.axis + "]", node.attr.val), flags);
        }
        /* Generate half-space primitive when it cannot be compiled into a corner
        #if typeof node.attr.val == 'string'
        #  ro = glslCompiler.preludeTop flags.glslPrelude # Current ray origin
        #  if flags.invert
        #    node.code = primitiveCallback (glsl.sub node.attr.val, "#{ro}[#{node.attr.axis}]"), flags
        #  else
        #    node.code = primitiveCallback (glsl.sub "#{ro}[#{node.attr.axis}]", node.attr.val), flags
        #else
        # Bin half-spaces for corner compilation
        translateOffset = 0.0
        for s in stack
          if s.halfSpaces?
            # Assign to the halfspace bins for corner compilation
            index = node.attr.axis + (if flags.invert then 3 else 0)
            val = glsl.add node.attr.val, translateOffset
            s.halfSpaces[index] =
              if s.halfSpaces[index] == null
                 val
              else if flags.composition[flags.composition.length - 1] == glslCompiler.COMPOSITION_UNION
                if index < 3
                  glsl.max s.halfSpaces[index], val
                else
                  glsl.min s.halfSpaces[index], val
              else
                if index < 3
                  glsl.min s.halfSpaces[index], val
                else
                  glsl.max s.halfSpaces[index], val
          else
            switch s.type
              when 'translate'
                translateOffset = glsl.add translateOffset, s.attr.offset[node.attr.axis]
                continue # Search for preceding intersect/union node 
              when 'invert', 'mirror'
                continue # Search for preceding intersect/union node
              else
                # This may occur in special cases where we cannot do normal corner compilation
                # (Such as a separate transformation on the plane itself - with a wedge node for example)
                ro = glslCompiler.preludeTop flags.glslPrelude # Current ray origin
                if flags.invert
                  node.code = primitiveCallback (glsl.sub node.attr.val, "#{ro}[#{node.attr.axis}]"), flags
                else
                  node.code = primitiveCallback (glsl.sub "#{ro}[#{node.attr.axis}]", node.attr.val), flags
          break
        #
        */
        return stack[0].nodes.push(node);
      },
      corner: function(stack, node, flags) {
        var bevelRadius, chamferRadius, cornerDist, cornerVal, diagonalDist, dist, ro, roSigned, s, _i, _len;
        ro = glslCompiler.preludeTop(flags.glslPrelude);
        dist = glslCompiler.preludeAdd(flags.glslPrelude, glsl.sub(ro, node.attr.val));
        chamferRadius = 0;
        bevelRadius = 0;
        for (_i = 0, _len = stack.length; _i < _len; _i++) {
          s = stack[_i];
          switch (s.type) {
            case 'chamfer':
              chamferRadius = s.attr.radius;
              break;
            case 'bevel':
              bevelRadius = s.attr.radius;
              break;
            case 'translate':
            case 'rotate':
            case 'scale':
            case 'invert':
            case 'mirror':
            case 'repeat':
              continue;
          }
          break;
        }
        if (bevelRadius !== 0) {
          roSigned = glslCompiler.preludeAdd(flags.glslPrelude, flags.invert ? "-" + ro : "" + ro);
          cornerVal = typeof node.attr.val === 'string' ? glslCompiler.preludeAdd(flags.glslPrelude, node.attr.val) : node.attr.val;
          diagonalDist = ["(" + roSigned + "[0] + " + roSigned + "[1] - (" + (glsl.add(glsl.index(cornerVal, 0), glsl.index(cornerVal, 1))) + "))", "(" + roSigned + "[0] + " + roSigned + "[2] - (" + (glsl.add(glsl.index(cornerVal, 0), glsl.index(cornerVal, 2))) + "))", "(" + roSigned + "[1] + " + roSigned + "[2] - (" + (glsl.add(glsl.index(cornerVal, 1), glsl.index(cornerVal, 2))) + "))"];
          if (flags.invert) {
            cornerDist = "length(min(" + dist + ", 0.0))";
            node.code = primitiveCallback("min(min(min(" + cornerDist + ", " + math_invsqrt2 + " * " + (glsl.index(diagonalDist, 0)) + " - " + bevelRadius + "), " + math_invsqrt2 + " * " + (glsl.index(diagonalDist, 1)) + " - " + bevelRadius + "), " + math_invsqrt2 + " * " + (glsl.index(diagonalDist, 2)) + " - " + bevelRadius + ")", flags);
          } else {
            cornerDist = "length(max(" + dist + ", 0.0))";
            node.code = primitiveCallback("max(max(max(" + cornerDist + ", " + math_invsqrt2 + " * " + (glsl.index(diagonalDist, 0)) + " + " + bevelRadius + "), " + math_invsqrt2 + " * " + (glsl.index(diagonalDist, 1)) + " + " + bevelRadius + "), " + math_invsqrt2 + " * " + (glsl.index(diagonalDist, 2)) + " + " + bevelRadius + ")", flags);
          }
        } else if (chamferRadius !== 0) {
          if (flags.invert) {
            node.code = primitiveCallback("length(min(" + (glsl.add(dist, chamferRadius)) + ", 0.0)) - " + chamferRadius, flags);
          } else {
            node.code = primitiveCallback("length(max(" + (glsl.add(dist, chamferRadius)) + ", 0.0)) - " + chamferRadius, flags);
          }
        } else {
          if (flags.invert) {
            node.code = primitiveCallback("length(min(" + dist + ", 0.0))", flags);
          } else {
            node.code = primitiveCallback("length(max(" + dist + ", 0.0))", flags);
          }
        }
        return stack[0].nodes.push(node);
      },
      cylinder: function(stack, node, flags) {
        var planeCoords, ro;
        ro = glslCompiler.preludeTop(flags.glslPrelude);
        planeCoords = ['yz', 'xz', 'xy'][node.attr.axis];
        if (!flags.invert) {
          node.code = primitiveCallback(glsl.sub("length(" + ro + "." + planeCoords + ")", node.attr.radius), flags);
        } else {
          node.code = primitiveCallback(glsl.sub(node.attr.radius, "length(" + ro + "." + planeCoords + ")"), flags);
        }
        return stack[0].nodes.push(node);
      },
      sphere: function(stack, node, flags) {
        var ro;
        ro = glslCompiler.preludeTop(flags.glslPrelude);
        if (!flags.invert) {
          node.code = primitiveCallback(glsl.sub("length(" + ro + ")", node.attr.radius), flags);
        } else {
          node.code = primitiveCallback(glsl.sub(node.attr.radius, "length(" + ro + ")"), flags);
        }
        return stack[0].nodes.push(node);
      },
      material: function(stack, node, flags) {
        flags.materialIdStack.pop();
        return stack[0].nodes.push(node);
      },
      "default": function(stack, node, flags) {
        return stack[0].nodes.push(node);
      }
    };
    return (function(abstractSolidModel) {
      return glslCompiler(abstractSolidModel, preDispatch, postDispatch);
    });
  };

  glslSceneDistance = glslCompilerDistance((function(a) {
    return a;
  }), (function(a, b) {
    return "min(" + a + ", " + b + ")";
  }), (function(a, b) {
    return "max(" + a + ", " + b + ")";
  }), (function(oldVal, newVal) {
    return newVal;
  }));

  glslSceneId = glslCompilerDistance((function(a, flags) {
    var result;
    result = new toStringPrototype(a);
    result.materialId = flags.materialIdStack[flags.materialIdStack.length - 1];
    return result;
  }), (function(a, b, flags) {
    var id, memoA, memoB, result;
    memoA = glslCompiler.preludeAdd(flags.glslPrelude, String(a), 'float');
    memoB = glslCompiler.preludeAdd(flags.glslPrelude, String(b), 'float');
    id = glslCompiler.preludeAdd(flags.glslPrelude, "" + memoA + " < " + memoB + "? " + a.materialId + " : " + b.materialId, 'int');
    result = new toStringPrototype("" + memoA + " < " + memoB + "? " + memoA + " : " + memoB);
    result.materialId = id;
    return result;
  }), (function(a, b, flags) {
    var id, memoA, memoB, result;
    memoA = glslCompiler.preludeAdd(flags.glslPrelude, String(a), 'float');
    memoB = glslCompiler.preludeAdd(flags.glslPrelude, String(b), 'float');
    id = glslCompiler.preludeAdd(flags.glslPrelude, "" + memoA + " > " + memoB + "? " + a.materialId + " : " + b.materialId, 'int');
    result = new toStringPrototype("" + memoA + " > " + memoB + "? " + memoA + " : " + memoB);
    result.materialId = id;
    return result;
  }), (function(oldVal, newVal) {
    var result;
    result = new toStringPrototype(newVal);
    result.materialId = oldVal.materialId;
    return result;
  }));

  compileGLSL = safeExport('mecha.editor.compileGLSL', ['', ''], function(abstractSolidModel, params) {
    var fragmentShader, rayDirection, rayOrigin, shaders, usePerspectiveProjection, vertexShader;
    rayOrigin = 'ro';
    rayDirection = 'rd';
    usePerspectiveProjection = false;
    /* TEMPORARY
    mecha.logDebug "ASM:"
    mecha.logDebug abstractSolidModel
    #
    */
    vertexShader = function() {
      /* TODO: Bounds calculation is not being used yet
      boundsResult = compileASMBounds abstractSolidModel
      if not boundsResult?
        return ''
      if boundsResult.nodes.length != 1
        mecha.logInternalError 'GLSL Compiler: Expected exactly one result node from the bounding box compiler.'
        return ''
          
      bounds = boundsResult.nodes[0].bounds
      */
      var bounds, sceneTranslation;
      bounds = [[-1, -1, -1], [1, 1, 1]];
      /* TEMPORARY
      mecha.logDebug "Bounds Result:"
      mecha.logDebug boundsResult
      #
      */
      sceneTranslation = [isFinite(bounds[0][0]) && isFinite(bounds[1][0]) ? bounds[0][0] + bounds[1][0] : '0.0', isFinite(bounds[0][1]) && isFinite(bounds[1][1]) ? bounds[0][1] + bounds[1][1] : '0.0', isFinite(bounds[0][2]) && isFinite(bounds[1][2]) ? bounds[0][2] + bounds[1][2] : '0.0'];
      return "const float Infinity = (1.0/0.0);\nconst vec3 sceneScale = vec3(" + (bounds[1][0] - bounds[0][0]) + ", " + (bounds[1][1] - bounds[0][1]) + ", " + (bounds[1][2] - bounds[0][2]) + ");\nconst vec3 sceneTranslation = vec3(" + sceneTranslation + ");\nuniform mat4 projection;\nuniform mat4 view;\nuniform mat3 model;\nattribute vec3 position;\nvarying vec3 modelPosition;\n" + (usePerspectiveProjection ? "varying vec3 viewPosition;" : "") + "\nvoid main(void) {\n  modelPosition = position;\n  " + (usePerspectiveProjection ? "viewPosition = (view * vec4(position, 1.0)).xyz;" : "") + "\n  gl_Position = projection * view * vec4(model * position, 1.0);\n}\n";
    };
    fragmentShader = function() {
      var distanceCode, distancePreludeCode, distanceResult, generateUniforms, idCode, idPreludeCode, idResult, sceneMaterial;
      distanceResult = glslSceneDistance(abstractSolidModel);
      if (!(distanceResult != null)) return '';
      if (distanceResult.nodes.length !== 1) {
        mecha.logInternalError('GLSL Compiler: Expected exactly one result node from the distance compiler.');
      }
      /* TEMPORARY
      console.log "Distance Result:"
      console.log distanceResult
      #
      */
      idResult = glslSceneId(abstractSolidModel);
      if (idResult.nodes.length !== 1) {
        mecha.logInternalError('GLSL Compiler: Expected exactly one result node from the material id compiler.');
      }
      /* TEMPORARY
      console.log "Id Result:"
      console.log idResult
      #
      */
      sceneMaterial = function(materials) {
        var binarySearch, i, m, result, _ref;
        result = "\nvec3 sceneMaterial(in vec3 ro) {\n  int id = sceneId(ro);\n";
        /* Render the raw scene id as a grayscale value
        if materials.length > 0
          result += "  return vec3(float(id) * #{glsl.floatLit (1.0 / (materials.length - 1))});\n"
        else
          result += "  return vec3(0.5);\n"
        
        #
        */
        binarySearch = function(start, end) {
          var diff, mid;
          diff = end - start;
          if (diff === 1) {
            return "m" + start;
          } else {
            mid = start + Math.floor(diff * 0.5);
            return "(id < " + mid + "? " + (binarySearch(start, mid)) + " : " + (binarySearch(mid, end)) + ")";
          }
        };
        if (materials.length > 0) {
          for (i = 0, _ref = materials.length; 0 <= _ref ? i < _ref : i > _ref; 0 <= _ref ? i++ : i--) {
            m = materials[i];
            result += "  vec3 m" + i + " = " + m + ";\n";
          }
          result += "  return id >= 0? " + (binarySearch(0, materials.length)) + " : vec3(0.5);\n";
        } else {
          result += "  return vec3(0.5);\n";
        }
        result += "}\n\n";
        return result;
      };
      generateUniforms = function(params) {
        var attr, name;
        return ((function() {
          var _results;
          _results = [];
          for (name in params) {
            attr = params[name];
            _results.push("uniform " + attr.type + " " + name + "; // " + attr.description);
          }
          return _results;
        })()).join('\n');
      };
      distanceCode = distanceResult.nodes[0].code;
      distancePreludeCode = distanceResult.flags.glslPrelude.code;
      idCode = idResult.nodes[0].code;
      idPreludeCode = idResult.flags.glslPrelude.code;
      return "#ifdef GL_ES\n  precision highp float;\n#endif\nconst float Infinity = (1.0/0.0);\nuniform mat4 view;\nuniform mat3 model;\nvarying vec3 modelPosition;\n" + (usePerspectiveProjection ? "varying vec3 viewPosition;" : "") + "\n\n" + (generateUniforms(params)) + "\n\n" + (glslLibrary.compile(distanceResult.flags.glslFunctions)) + "\n\nfloat sceneDist(in vec3 " + rayOrigin + ") {\n  " + (distancePreludeCode != null ? distancePreludeCode : '') + "\n  return max(0.0," + (distanceCode != null ? distanceCode : 'Infinity') + ");\n}\n\nvec3 sceneNormal(in vec3 p) {\n  const float eps = 0.00001;\n  vec3 n;\n  n.x = sceneDist( vec3(p.x+eps, p.yz) ) - sceneDist( vec3(p.x-eps, p.yz) );\n  n.y = sceneDist( vec3(p.x, p.y+eps, p.z) ) - sceneDist( vec3(p.x, p.y-eps, p.z) );\n  n.z = sceneDist( vec3(p.xy, p.z+eps) ) - sceneDist( vec3(p.xy, p.z-eps) );\n  return normalize(n);\n}\n\nint sceneId(in vec3 " + rayOrigin + ") {\n  " + (idPreludeCode != null ? idPreludeCode : '') + "\n  " + (idCode != null ? idCode + ';' : '') + "\n  return " + (idCode != null ? idCode.materialId : '-1') + ";\n}\n\n" + (sceneMaterial(idResult.flags.materials)) + "\n\nvoid main(void) {\n  // Constants\n  const int steps = 84;\n  const float threshold = 0.005;\n  \n  vec3 rayOrigin = modelPosition;\n  vec3 rayDir = vec3(0.0,0.0,-1.0) * mat3(view) * model;\n  vec3 prevRayOrigin = rayOrigin;\n  bool hit = false;\n  float dist = Infinity;\n  //float prevDist = (1.0/0.0);\n  //float bias = 0.0; // corrective bias for the step size\n  //float minDist = (1.0/0.0);\n  for(int i = 0; i < steps; i++) {\n    //dist = sceneRayDist(rayOrigin, rayDir);\n    //prevDist = dist;\n    dist = sceneDist(rayOrigin);\n    //minDist = min(minDist, dist);\n    if (dist <= 0.0) {\n      hit = true;\n      break;\n    }\n    prevRayOrigin = rayOrigin;\n    //rayOrigin += (max(dist, threshold) + bias) * rayDir;\n    rayOrigin += max(dist, threshold) * rayDir;\n    if (all(notEqual(clamp(rayOrigin, vec3(-1.0), vec3(1.0)), rayOrigin))) { break; }\n  }\n  vec3 absRayOrigin = abs(rayOrigin);\n  //if(!hit && max(max(absRayOrigin.x, absRayOrigin.y), absRayOrigin.z) >= 1.0) { discard; }\n  //if(!hit && prevDist >= dist) { discard; }\n  if(!hit && rayOrigin.z <= -1.0) { \n    // Get the z-plane intersection\n    const float floorOffset = 1.0; // For the bottom of the bounding box this should be 0.0\n    const float boundaryOffset = -0.5; // For a larger boundary > 0.0, or for a smaller boundary < 0.0\n    const float shadeFactor = 0.45; // Shading factor (1.0 for full shader)\n    float dz = (modelPosition.z + 1.0) / -rayDir.z;\n    vec3 pz = modelPosition + rayDir * dz;\n    pz.z += floorOffset;\n    float shade = max(0.0, 1.0 + boundaryOffset - max(0.0,sceneDist(pz)));\n    gl_FragColor = vec4(0.0,0.0,0.0,max(0.0, shadeFactor*shade*shade*shade));\n  }\n  else if (!hit) {\n    discard;\n  }\n  else {\n    //if (!hit) { discard; }\n    //if(!hit) { gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0); return; }\n    //const vec3 diffuseColor = vec3(0.1, 0.2, 0.8);\n    vec3 diffuseColor = sceneMaterial(prevRayOrigin);\n    //const vec3 specularColor = vec3(1.0, 1.0, 1.0);\n          \n    // Lighting parameters\n    const float specularFactor = 0.3;\n    const float specularPhongShininess = 10.0;\n    const vec3 lightPos = vec3(1.5,2.5, 4.0);\n    vec3 lightDir = normalize(lightPos - prevRayOrigin);\n    vec3 normal = sceneNormal(prevRayOrigin);\n\n    //* Diffuse shading\n    float diffuse = dot(normal, lightDir);\n    //*\/\n    //* Phong reflection model\n    vec3 reflectDir = reflect(-rayDir, normal);\n    vec3 specular = vec3(specularFactor * pow(max(dot(reflectDir, rayDir), 0.0), specularPhongShininess));\n    //*\/\n\n    //* Regular shading\n    const float ambientFactor = 0.7;\n    const float diffuseFactor = 1.0 - ambientFactor;\n    diffuse = ambientFactor + diffuse * diffuseFactor;\n    //*\/\n\n    /* Cel shading\n    const float cellA = 0.3;\n    const float cellB = 0.4;\n    const float cellC = 0.5;\n    const float cellD = 1.0 - cellA;\n    diffuse = cellA + max(step(cellA, diffuse)*cellA, max(step(cellB, diffuse)*cellB, max(step(cellC, diffuse)*cellC, step(cellD, diffuse)*cellD)));\n    //*\/\n\n    //* Ambient occlusion\n    const float aoIterations = 5.0;\n    const float aoFactor = 2.0;\n    const float aoDistanceFactor = 1.6;\n    const float aoDistanceDelta = 0.1 / 5.0;\n    float ao = 1.0;\n    float invPow2 = 1.0;\n    vec3 aoDirDist = normal * aoDistanceDelta;\n    vec3 aoPos = prevRayOrigin;\n    for (float i = 1.0; i < (aoIterations + 1.0);  i += 1.0) {\n      invPow2 *= aoDistanceFactor * 0.5;\n      aoPos += aoDirDist;\n      ao -= aoFactor * invPow2 * (i * aoDistanceDelta - sceneDist(aoPos));\n    }\n    diffuse *= max(ao, 0.0);\n    //*\/\n    \n    gl_FragColor = vec4(diffuseColor * diffuse + specular, 1.0);\n  }\n}\n";
    };
    shaders = [vertexShader(), fragmentShader()];
    return shaders;
  });

  result = typeof exports !== "undefined" && exports !== null ? exports : {};

  result.compileGLSL = compileGLSL;

  return result;

}).call(this);
