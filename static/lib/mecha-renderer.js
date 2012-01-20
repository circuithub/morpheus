/*
 * Copyright 2011, CircuitHub.com
 */
var mecha = mecha || {}; /* Redeclaring mecha is fine: behaves like a no-op (https://developer.mozilla.org/en/JavaScript/Reference/Scope_Cheatsheet) */

mecha.renderer = 
(function() {

  "use strict";

  var createScene, exports, gl, math_degToRad, math_invsqrt2, math_radToDeg, math_sqrt2, modelArguments, modelRotate, modelShaders, runScene, state;

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

  mecha.logInternalError = ((typeof console !== "undefined" && console !== null) && (console.error != null) ? function() {
    return console.error.apply(console, arguments);
  } : function() {});

  mecha.logApiError = ((typeof console !== "undefined" && console !== null) && (console.error != null) ? function() {
    return console.error.apply(console, arguments);
  } : function() {});

  mecha.logApiWarning = ((typeof console !== "undefined" && console !== null) && (console.warn != null) ? function() {
    return console.warn.apply(console, arguments);
  } : function() {});

  gl = glQuery;

  state = {
    canvas: null,
    context: null,
    nextFrame: null,
    shader: {
      program: null,
      vs: null,
      fs: null
    },
    rotation: [1.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 1.0]
  };

  modelShaders = function(modelName, shaders) {
    var success;
    success = true;
    if (!(state.shader.program != null)) {
      state.shader.program = state.context.createProgram();
      state.shader.vs = state.context.createShader(state.context.VERTEX_SHADER);
      state.context.attachShader(state.shader.program, state.shader.vs);
      state.shader.fs = state.context.createShader(state.context.FRAGMENT_SHADER);
      state.context.attachShader(state.shader.program, state.shader.fs);
    }
    state.context.shaderSource(state.shader.vs, shaders[0]);
    state.context.shaderSource(state.shader.fs, shaders[1]);
    state.context.compileShader(state.shader.vs);
    if (!state.context.getShaderParameter(state.shader.vs, state.context.COMPILE_STATUS)) {
      mecha.logApiError("Shader compile failed:\n" + (state.context.getShaderInfoLog(state.shader.vs)) + "\n" + shaders[0]);
    }
    state.context.compileShader(state.shader.fs);
    if (!state.context.getShaderParameter(state.shader.fs, state.context.COMPILE_STATUS)) {
      mecha.logApiError("Shader compile failed:\n" + (state.context.getShaderInfoLog(state.shader.fs)) + "\n" + shaders[1]);
    }
    state.context.linkProgram(state.shader.program);
    if (!state.context.getProgramParameter(state.shader.program, state.context.LINK_STATUS)) {
      mecha.logApiError("Shader link failed:\n" + (state.context.getProgramInfoLog(state.shader.progam)));
    }
    (gl('scene')).shaderProgram(state.shader.program);
    gl.refresh(state.shader.program);
    return success;
  };

  modelArguments = function(modelName, args) {
    var name, val;
    for (name in args) {
      val = args[name];
      (gl(modelName)).uniform(name, val);
    }
  };

  modelRotate = function(modelName, axis, angle) {
    gl.matrix3.mul(state.rotation, state.rotation, gl.matrix3.newAxisRotation(axis, angle));
    return (gl(modelName)).uniform('rotation', state.rotation);
  };

  createScene = function(context) {
    var ibo, indices, positions, vbo;
    state.context = context;
    positions = [1.0, 1.0, -1.0, 1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, 1.0, -1.0, 1.0, 1.0, 1.0, 1.0, -1.0, 1.0, -1.0, -1.0, 1.0, -1.0, 1.0, 1.0, 1.0, 1.0, -1.0, 1.0, 1.0, 1.0, 1.0, -1.0, 1.0, 1.0, -1.0, -1.0, 1.0, -1.0, -1.0, 1.0, -1.0, 1.0, -1.0, -1.0, 1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, 1.0, -1.0, 1.0, 1.0, -1.0, 1.0, -1.0, 1.0, 1.0, 1.0, 1.0, 1.0, -1.0, -1.0, 1.0, -1.0, -1.0, 1.0, 1.0];
    indices = [0, 1, 2, 0, 2, 3, 4, 7, 6, 4, 6, 5, 8, 9, 10, 8, 10, 11, 12, 13, 14, 12, 14, 15, 16, 17, 18, 16, 18, 19, 20, 21, 22, 20, 22, 23];
    vbo = context.createBuffer();
    context.bindBuffer(context.ARRAY_BUFFER, vbo);
    context.bufferData(context.ARRAY_BUFFER, new Float32Array(positions), context.STATIC_DRAW);
    ibo = context.createBuffer();
    context.bindBuffer(context.ELEMENT_ARRAY_BUFFER, ibo);
    context.bufferData(context.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), context.STATIC_DRAW);
    gl.scene({
      'scene': ''
    }).vertexAttrib('position', vbo, 9 * 8, gl.FLOAT, 3, false, 0, 0).vertexElem(ibo, 6 * 6, gl.UNSIGNED_SHORT, 0).uniform('view', gl.matrix4.newLookAt([10.0, 10.0, 10.0], [0.0, 0.0, 0.0], [0.0, 0.0, 1.0])).uniform('projection', gl.matrix4.newOrtho(-math_sqrt2, math_sqrt2, -math_sqrt2, math_sqrt2, 0.1, 100.0)).triangles();
  };

  runScene = function(canvas, idleCallback) {
    var callback;
    callback = function() {
      if (gl.update()) {
        state.context.clear(state.context.DEPTH_BUFFER_BIT | state.context.COLOR_BUFFER_BIT);
        (gl('scene')).render(state.context);
      } else {
        idleCallback();
      }
      return self.nextFrame = window.requestAnimationFrame(callback, canvas);
    };
    state.context.viewport(0, 0, canvas.width, canvas.height);
    state.context.clearColor(0.0, 0.0, 0.0, 0.0);
    state.nextFrame = window.requestAnimationFrame(callback, canvas);
  };

  exports = exports != null ? exports : {};

  exports.createScene = createScene;

  exports.runScene = runScene;

  exports.modelShaders = modelShaders;

  exports.modelArguments = modelArguments;

  exports.modelRotate = modelRotate;

  return exports;

}).call(this);
