/*
 * Copyright 2011, CircuitHub.com
 */
var mecha = mecha || {}; /* Redeclaring mecha is fine: behaves like a no-op (https://developer.mozilla.org/en/JavaScript/Reference/Scope_Cheatsheet) */

mecha.gui = 
(function() {

  "use strict";

  var apiInit, canvasInit, constants, controlsInit, controlsParamChange, controlsSourceCompile, create, createControls, exports, gl, init, keyDown, math_degToRad, math_invsqrt2, math_radToDeg, math_sqrt2, mechaDebug, mouseCoordsWithinElement, mouseDown, mouseMove, mouseUp, mouseWheel, registerControlEvents, registerDOMEvents, registerEditorEvents, safeExport, safeTry, sceneIdle, sceneInit, state, windowResize;

  math_sqrt2 = Math.sqrt(2.0);

  math_invsqrt2 = 1.0 / math_sqrt2;

  math_degToRad = Math.PI / 180.0;

  math_radToDeg = 180.0 / Math.PI;

  Math.clamp = function(s, min, max) {
    return Math.min(Math.max(s, min), max);
  };

  mechaDebug = true;

  mecha.log = ((typeof console !== "undefined" && console !== null) && (console.log != null) ? function() {
    return console.log.apply(console, arguments);
  } : function() {});

  mecha.logDebug = ((mechaDebug != null) && mechaDebug && (typeof console !== "undefined" && console !== null) && (console.log != null) ? function() {
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
    if ((mechaDebug != null) && mechaDebug) {
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

  gl = glQuery;

  constants = {
    canvas: {
      defaultSize: [512, 512]
    },
    camera: {
      maxOrbitSpeed: Math.PI * 0.1,
      orbitSpeedFactor: 0.05,
      zoomSpeedFactor: 0.5
    }
  };

  state = {
    scene: null,
    canvas: null,
    viewport: {
      domElement: null,
      mouse: {
        last: [0, 0],
        leftDown: false,
        middleDown: false,
        leftDragDistance: 0,
        middleDragDistance: 0
      }
    },
    api: {
      url: null,
      sourceCode: null
    },
    application: {
      initialized: false
    },
    models: {},
    parameters: {
      domElement: null
    },
    paths: {
      mechaUrlRoot: null,
      jsandboxUrl: null
    }
  };

  mouseCoordsWithinElement = function(event) {
    var coords, element, totalOffsetLeft, totalOffsetTop;
    coords = [0, 0];
    if (!event) {
      event = window.event;
      coords = [event.x, event.y];
    } else {
      element = event.target;
      totalOffsetLeft = 0;
      totalOffsetTop = 0;
      while (element.offsetParent) {
        totalOffsetLeft += element.offsetLeft;
        totalOffsetTop += element.offsetTop;
        element = element.offsetParent;
      }
      coords = [event.pageX - totalOffsetLeft, event.pageY - totalOffsetTop];
    }
    return coords;
  };

  windowResize = safeExport('mecha.gui: windowResize', void 0, function() {});

  mouseDown = safeExport('mecha.gui: mouseDown', void 0, function(event) {
    state.viewport.mouse.last = [event.clientX, event.clientY];
    switch (event.which) {
      case 1:
        return state.viewport.mouse.leftDown = true;
      case 2:
        return state.viewport.mouse.middleDown = true;
    }
    /* Pick the object under the mouse
    if not state.scene?
      return
    if event.which == 1 # Left mouse button
      coords = mouseCoordsWithinElement event
      state.viewport.mouse.pickRecord = state.scene.pick coords[0], coords[1]
    */
  });

  mouseUp = safeExport('mecha.gui: mouseUp', void 0, function(event) {
    switch (event.which) {
      case 1:
        state.viewport.mouse.leftDown = false;
        state.viewport.mouse.leftDragDistance = 0;
        break;
      case 2:
        state.viewport.mouse.middleDown = false;
        state.viewport.mouse.middleDragDistance = 0;
    }
  });

  mouseMove = function(event) {
    return safeTry("mecha.gui: mouseMove", (function() {
      var delta, deltaLength, orbitAngles;
      delta = [event.clientX - state.viewport.mouse.last[0], event.clientY - state.viewport.mouse.last[1]];
      deltaLength = gl.vec2.length(delta);
      if (state.viewport.mouse.leftDown) {
        state.viewport.mouse.leftDragDistance += deltaLength;
      }
      if (state.viewport.mouse.middleDown) {
        state.viewport.mouse.middleDragDistance += deltaLength;
      }
      if (state.viewport.mouse.leftDown && event.which === 1) {
        orbitAngles = [0.0, 0.0];
        gl.vec2.mul(orbitAngles, delta, constants.camera.orbitSpeedFactor / deltaLength);
        orbitAngles = [Math.clamp(orbitAngles[0], -constants.camera.maxOrbitSpeed, constants.camera.maxOrbitSpeed), Math.clamp(orbitAngles[1], -constants.camera.maxOrbitSpeed, constants.camera.maxOrbitSpeed)];
        if ((isNaN(orbitAngles[0])) || (Math.abs(orbitAngles[0])) === Infinity) {
          orbitAngles[0] = 0.0;
        }
        if ((isNaN(orbitAngles[1])) || (Math.abs(orbitAngles[1])) === Infinity) {
          orbitAngles[1] = 0.0;
        }
        mecha.renderer.modelRotate('scene', orbitAngles);
      }
      return state.viewport.mouse.last = [event.clientX, event.clientY];
    }), (function(error) {}))();
  };

  mouseWheel = safeExport('mecha.gui: mouseWheel', void 0, function(event) {
    var delta, zoomDistance;
    delta = event.wheelDelta != null ? event.wheelDelta / -120.0 : Math.clamp(event.detail, -1.0, 1.0);
    zoomDistance = delta * constants.camera.zoomSpeedFactor;
  });

  keyDown = safeExport('mecha.gui: keyDown', void 0, function(event) {});

  controlsSourceCompile = safeExport('mecha.gui.controlsSourceCompile', void 0, function() {
    sceneInit();
  });

  controlsParamChange = safeExport('mecha.gui.controlsParamChange', void 0, function(event) {
    var model, paramIndex, paramName, splitElName;
    splitElName = event.target.name.split('[', 2);
    paramName = splitElName[0];
    paramIndex = splitElName.length > 1 ? Number((splitElName[1].split(']', 2))[0]) : 0;
    model = state.models['scene'];
    if (model.params[paramName] != null) {
      switch (model.params[paramName].type) {
        case 'float':
          model.args[paramName] = Number(($(event.target)).val());
          break;
        case 'vec2':
        case 'vec3':
        case 'vec4':
          model.args[paramName][paramIndex] = Number(($(event.target)).val());
          break;
        default:
          mecha.logInternalError("Unknown type `" + model.params[paramName].type + "` for parameter `" + paramName + "` during change event.");
      }
    }
    mecha.renderer.modelArguments('scene', model.args);
  });

  registerDOMEvents = function() {
    state.viewport.domElement.addEventListener('mousedown', mouseDown, true);
    state.viewport.domElement.addEventListener('mouseup', mouseUp, true);
    state.viewport.domElement.addEventListener('mousemove', mouseMove, true);
    state.viewport.domElement.addEventListener('mousewheel', mouseWheel, true);
    state.viewport.domElement.addEventListener('DOMMouseScroll', mouseWheel, true);
    document.addEventListener('keydown', keyDown, true);
    return window.addEventListener('resize', windowResize, true);
  };

  registerEditorEvents = function() {
    return ($('#mecha-source-compile')).click(controlsSourceCompile);
  };

  registerControlEvents = function() {
    ($('#mecha-param-inputs')).delegate('.mecha-param-range', 'change', controlsParamChange);
    return ($('#mecha-param-inputs')).delegate('.mecha-param-number', 'change', controlsParamChange);
  };

  sceneIdle = function() {
    return safeTry("mecha.gui: sceneIdle", (function() {}), (function(error) {}))();
  };

  canvasInit = function() {
    return windowResize();
  };

  sceneInit = safeExport('mecha.gui: sceneInit', void 0, function() {
    var csmSourceCode, requestId;
    csmSourceCode = mecha.generator.translateCSM(state.api.sourceCode, mecha.editor.getSourceCode());
    requestId = JSandbox.eval({
      data: csmSourceCode,
      callback: function(result) {
        var attr, model, name, _ref, _ref2, _ref3;
        console.log(result);
        model = state.models['scene'];
        if (!(model != null)) {
          model = state.models['scene'] = {
            shaders: [],
            params: {},
            args: {}
          };
        }
        model.params = (_ref = result != null ? (_ref2 = result.attr) != null ? _ref2.params : void 0 : void 0) != null ? _ref : {};
        _ref3 = model.params;
        for (name in _ref3) {
          attr = _ref3[name];
          if (!(model.args[name] != null)) model.args[name] = attr.defaultArg;
        }
        model.shaders = mecha.generator.compileGLSL(mecha.generator.compileASM(result), model.params);
        console.log(model.shaders[1]);
        mecha.renderer.modelShaders('scene', model.shaders);
        mecha.renderer.modelArguments('scene', model.args);
        return controlsInit();
      },
      onerror: function(data, request) {
        return mecha.logInternalError("Error compiling the solid model.");
      }
    });
  });

  controlsInit = safeExport('mecha.gui: controlsInit', void 0, function() {
    var el, html, model, name, param, stepAttr, val, _ref, _ref2;
    el = state.parameters.domElement;
    if (el != null) {
      html = '<table>';
      _ref = state.models;
      for (name in _ref) {
        model = _ref[name];
        _ref2 = model.params;
        for (param in _ref2) {
          val = _ref2[param];
          html += "<tr><td><label for='" + param + "'>" + val.description + "</label></td><td>";
          switch (val.param) {
            case 'range':
              switch (val.type) {
                case 'float':
                  stepAttr = val.step ? " step='" + val.step + "'" : '';
                  html += "<input name='" + param + "' id='" + param + "' class='mecha-param-range' type='range' value='" + val.defaultArg + "' min='" + val.start + "' max='" + val.end + "'" + stepAttr + "></input>";
                  break;
                case 'vec2':
                  stepAttr = val.step ? [" step='" + val.step[0] + "'", " step='" + val.step[1] + "'"] : ['', ''];
                  html += "<div><label for='" + param + "[0]'>x</label><input name='" + param + "[0]' id='" + param + "[0]' class='mecha-param-range' type='range' value='" + val.defaultArg[0] + "' min='" + val.start[0] + "' max='" + val.end[0] + "'" + stepAttr[0] + "></input></div>";
                  html += "<div><label for='" + param + "[0]'>y</label><input name='" + param + "[1]' id='" + param + "[1]' class='mecha-param-range' type='range' value='" + val.defaultArg[1] + "' min='" + val.start[1] + "' max='" + val.end[1] + "'" + stepAttr[1] + "></input></div>";
                  break;
                case 'vec3':
                  stepAttr = val.step ? [" step='" + val.step[0] + "'", " step='" + val.step[1] + "'", " step='" + val.step[2] + "'"] : ['', '', ''];
                  html += "<div><label for='" + param + "[0]'>x</label><input name='" + param + "[0]' id='" + param + "[0]' class='mecha-param-range' type='range' value='" + val.defaultArg[0] + "' min='" + val.start[0] + "' max='" + val.end[0] + "'" + stepAttr[0] + "></input></div>";
                  html += "<div><label for='" + param + "[0]'>y</label><input name='" + param + "[1]' id='" + param + "[1]' class='mecha-param-range' type='range' value='" + val.defaultArg[1] + "' min='" + val.start[1] + "' max='" + val.end[1] + "'" + stepAttr[1] + "></input></div>";
                  html += "<div><label for='" + param + "[0]'>z</label><input name='" + param + "[2]' id='" + param + "[2]' class='mecha-param-range' type='range' value='" + val.defaultArg[2] + "' min='" + val.start[2] + "' max='" + val.end[2] + "'" + stepAttr[2] + "></input></div>";
                  break;
                case 'vec4':
                  stepAttr = val.step ? [" step='" + val.step[0] + "'", " step='" + val.step[1] + "'", " step='" + val.step[2] + "'", " step='" + val.step[3] + "'"] : ['', '', '', ''];
                  html += "<div><label for='" + param + "[0]'>x</label><input name='" + param + "[0]' id='" + param + "[0]' class='mecha-param-range' type='range' value='" + val.defaultArg[0] + "' min='" + val.start[0] + "' max='" + val.end[0] + "'" + stepAttr[0] + "></input></div>";
                  html += "<div><label for='" + param + "[0]'>y</label><input name='" + param + "[1]' id='" + param + "[1]' class='mecha-param-range' type='range' value='" + val.defaultArg[1] + "' min='" + val.start[1] + "' max='" + val.end[1] + "'" + stepAttr[1] + "></input></div>";
                  html += "<div><label for='" + param + "[0]'>z</label><input name='" + param + "[2]' id='" + param + "[2]' class='mecha-param-range' type='range' value='" + val.defaultArg[2] + "' min='" + val.start[2] + "' max='" + val.end[2] + "'" + stepAttr[2] + "></input></div>";
                  html += "<div><label for='" + param + "[0]'>w</label><input name='" + param + "[3]' id='" + param + "[3]' class='mecha-param-range' type='range' value='" + val.defaultArg[3] + "' min='" + val.start[3] + "' max='" + val.end[3] + "'" + stepAttr[3] + "></input></div>";
                  break;
                default:
                  mecha.logInternalError("Unknown range type `" + val.type + "` for parameter `" + param + "`.");
              }
              break;
            case 'number':
              switch (val.type) {
                case 'float':
                  html += "<input name='" + param + "' id='" + param + "' class='mecha-param-number' type='number' value='" + val.defaultArg + "'></input>";
                  break;
                case 'vec2':
                  html += "<div><label for='" + param + "[0]'>x</label><input name='" + param + "[0]' id='" + param + "[0]' class='mecha-param-number' type='number' value='" + val.defaultArg[0] + "'></input></div>";
                  html += "<div><label for='" + param + "[0]'>y</label><input name='" + param + "[1]' id='" + param + "[1]' class='mecha-param-number' type='number' value='" + val.defaultArg[1] + "'></input></div>";
                  break;
                case 'vec3':
                  html += "<div><label for='" + param + "[0]'>x</label><input name='" + param + "[0]' id='" + param + "[0]' class='mecha-param-number' type='number' value='" + val.defaultArg[0] + "'></input></div>";
                  html += "<div><label for='" + param + "[1]'>y</label><input name='" + param + "[1]' id='" + param + "[1]' class='mecha-param-number' type='number' value='" + val.defaultArg[1] + "'></input></div>";
                  html += "<div><label for='" + param + "[2]'>z</label><input name='" + param + "[2]' id='" + param + "[2]' class='mecha-param-number' type='number' value='" + val.defaultArg[2] + "'></input></div>";
                  break;
                case 'vec4':
                  html += "<div><label for='" + param + "[0]'>x</label><input name='" + param + "[0]' id='" + param + "[0]' class='mecha-param-number' type='number' value='" + val.defaultArg[0] + "'></input></div>";
                  html += "<div><label for='" + param + "[1]'>y</label><input name='" + param + "[1]' id='" + param + "[1]' class='mecha-param-number' type='number' value='" + val.defaultArg[1] + "'></input></div>";
                  html += "<div><label for='" + param + "[2]'>z</label><input name='" + param + "[2]' id='" + param + "[2]' class='mecha-param-number' type='number' value='" + val.defaultArg[2] + "'></input></div>";
                  html += "<div><label for='" + param + "[3]'>w</label><input name='" + param + "[3]' id='" + param + "[3]' class='mecha-param-number' type='number' value='" + val.defaultArg[3] + "'></input></div>";
                  break;
                default:
                  mecha.logInternalError("Unknown number type `" + val.type + "` for parameter `" + param + "`.");
              }
          }
          html += "</td></tr>";
        }
      }
      html += '</table>';
      el.innerHTML = html;
    }
  });

  apiInit = function(callback) {
    var $apiLink;
    $apiLink = $("link[rel='api']");
    if (typeof state.paths.mechaUrlRoot === 'string') {
      state.api.url = state.paths.mechaUrlRoot.length === 0 || state.paths.mechaUrlRoot[state.paths.mechaUrlRoot.length - 1] === '/' ? state.paths.mechaUrlRoot + 'mecha-api.min.js' : state.paths.mechaUrlRoot + '/mecha-api.min.js';
    } else if ($apiLink.length > 0) {
      state.api.url = $apiLink.attr('href');
    } else {
      state.api.url = 'mecha-api.min.js';
    }
    return ($.get(state.api.url, void 0, void 0, 'text')).success(function(data, textStatus, jqXHR) {
      state.api.sourceCode = data;
      mecha.log("Loaded " + state.api.url);
      if (callback != null) return callback();
    }).error(function() {
      return mecha.log("Error loading API script");
    });
  };

  init = function(containerEl, canvasEl) {
    state.viewport.domElement = containerEl;
    state.canvas = canvasEl;
    if (state.canvas != null) {
      state.scene = mecha.renderer.createScene(state.canvas.getContext('experimental-webgl'));
      mecha.renderer.runScene(state.canvas, (function() {}));
    }
    canvasInit();
    apiInit(sceneInit);
    registerDOMEvents();
    registerEditorEvents();
    return state.application.initialized = true;
  };

  create = safeExport('mecha.gui.create', false, function(container, jsandboxUrl, mechaUrlRoot, fixedWidth, fixedHeight) {
    var containerEl, errorHtml;
    errorHtml = "<div>Could not create Mecha GUI. Please see the console for error messages.</div>";
    if (!(fixedWidth != null)) fixedWidth = 512;
    if (!(fixedHeight != null)) fixedHeight = 512;
    if (container !== null && typeof container !== 'string' && (typeof container !== 'object' || container.nodeName !== 'DIV')) {
      containerEl.innerHTML = errorHtml;
      mecha.logApiError("Mecha GUI: (ERROR) Invalid container id '" + container + "' supplied, expected type 'string' or dom element of type 'DIV'.");
      return false;
    } else if (container === null) {
      mecha.logApiWarning("Mecha GUI: (WARNING) No container element supplied. Creating a div element here...");
    } else {
      containerEl = typeof container === 'string' ? document.getElementById(container) : container;
    }
    if (containerEl === null) {
      mecha.logApiError("Mecha GUI: (ERROR) Invalid container id '" + container + "' supplied, could not find a matching 'DIV' element in the document.");
      return false;
    }
    containerEl.innerHTML = ("<canvas id='mecha-canvas' width='" + fixedWidth + "' height='" + fixedHeight + "'>\n  <p>This application requires a browser that supports the<a href='http://www.w3.org/html/wg/html5/'>HTML5</a>&lt;canvas&gt; feature.</p>\n</canvas>") + containerEl.innerHTML;
    if (jsandboxUrl != null) state.paths.jsandboxUrl = jsandboxUrl;
    if (mechaUrlRoot != null) state.paths.mechaUrlRoot = mechaUrlRoot;
    if (state.paths.jsandboxUrl != null) JSandbox.create(state.paths.jsandboxUrl);
    init(containerEl, document.getElementById('mecha-canvas'));
    return true;
  });

  createControls = safeExport('mecha.gui.createControls', false, function(container) {
    var containerEl;
    if (container !== null && typeof container !== 'string' && (typeof container !== 'object' || container.nodeName !== 'DIV')) {
      mecha.logApiError("Mecha GUI: (ERROR) Invalid container id '" + container + "' supplied, expected type 'string' or dom element of type 'DIV'.");
      return false;
    } else if (container === null) {
      mecha.logApiWarning("Mecha GUI: (WARNING) No container element supplied. Creating a div element here...");
    } else {
      containerEl = typeof container === 'string' ? document.getElementById(container) : container;
    }
    if (containerEl === null) {
      mecha.logApiError("Mecha GUI: (ERROR) Invalid container id '" + container + "' supplied, could not find a matching 'DIV' element in the document.");
      return false;
    }
    if (!(state.parameters.domElement != null)) {
      state.parameters.domElement = document.createElement('form');
      state.parameters.domElement.id = 'mecha-param-inputs';
      containerEl.appendChild(state.parameters.domElement);
    }
    controlsInit();
    registerControlEvents();
    return true;
  });

  exports = exports != null ? exports : {};

  exports.create = create;

  exports.createControls = createControls;

  return exports;

}).call(this);
