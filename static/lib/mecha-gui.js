/*
 * Copyright 2011, CircuitHub.com
 */
var mecha = mecha || {}; /* Redeclaring mecha is fine: behaves like a no-op (https://developer.mozilla.org/en/JavaScript/Reference/Scope_Cheatsheet) */

mecha.gui = 
(function() {

  "use strict";

  var apiInit, canvasInit, constants, controlsInit, controlsParamChange, controlsSourceCompile, create, createControls, exports, gl, init, keyDown, lookAtToQuaternion, math_degToRad, math_invsqrt2, math_radToDeg, math_sqrt2, modifySubAttr, mouseCoordsWithinElement, mouseDown, mouseMove, mouseUp, mouseWheel, orbitLookAt, orbitLookAtNode, recordToVec3, recordToVec4, registerControlEvents, registerDOMEvents, registerEditorEvents, sceneIdle, sceneInit, state, vec3ToRecord, vec4ToRecord, windowResize, zoomLookAt, zoomLookAtNode;

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

  modifySubAttr = function(node, attr, subAttr, value) {
    var attrRecord;
    attrRecord = node.get(attr);
    attrRecord[subAttr] = value;
    return node.set(attr, attrRecord);
  };

  recordToVec3 = function(record) {
    return [record.x, record.y, record.z];
  };

  recordToVec4 = function(record) {
    return [record.x, record.y, record.z, record.w];
  };

  vec3ToRecord = function(vec) {
    return {
      x: vec[0],
      y: vec[1],
      z: vec[2]
    };
  };

  vec4ToRecord = function(vec) {
    return {
      x: vec[0],
      y: vec[1],
      z: vec[2],
      w: vec[3]
    };
  };

  lookAtToQuaternion = function(lookAt) {
    var eye, look, up, x, y, z;
    eye = recordToVec3(lookAt.eye);
    look = recordToVec3(lookAt.look);
    up = recordToVec3(lookAt.up);
    x = [0.0, 0.0, 0.0];
    y = [0.0, 0.0, 0.0];
    z = [0.0, 0.0, 0.0];
    SceneJS_math_subVec3(look, eye, z);
    SceneJS_math_cross3Vec3(up, z, x);
    SceneJS_math_cross3Vec3(z, x, y);
    SceneJS_math_normalizeVec3(x);
    SceneJS_math_normalizeVec3(y);
    SceneJS_math_normalizeVec3(z);
    return SceneJS_math_newQuaternionFromMat3(x.concat(y, z));
  };

  orbitLookAt = function(dAngles, orbitUp, lookAt) {
    var axis, dAngle, eye0, eye0len, eye0norm, eye1, look, result, rotMat, tangent0, tangent0norm, tangent1, tangentError, up0, up0norm, up1;
    if (dAngles[0] === 0.0 && dAngles[1] === 0.0) {
      return {
        eye: lookAt.eye,
        up: lookAt.up
      };
    }
    eye0 = recordToVec3(lookAt.eye);
    up0 = recordToVec3(lookAt.up);
    look = recordToVec3(lookAt.look);
    eye0len = SceneJS_math_lenVec3(eye0);
    eye0norm = [0.0, 0.0, 0.0];
    SceneJS_math_mulVec3Scalar(eye0, 1.0 / eye0len, eye0norm);
    tangent0 = [0.0, 0.0, 0.0];
    SceneJS_math_cross3Vec3(up0, eye0, tangent0);
    tangent0norm = SceneJS_math_normalizeVec3(tangent0);
    up0norm = [0.0, 0.0, 0.0];
    SceneJS_math_cross3Vec3(eye0norm, tangent0norm, up0norm);
    axis = [tangent0norm[0] * -dAngles[1] + up0norm[0] * -dAngles[0], tangent0norm[1] * -dAngles[1] + up0norm[1] * -dAngles[0], tangent0norm[2] * -dAngles[1] + up0norm[2] * -dAngles[0]];
    dAngle = SceneJS_math_lenVec2(dAngles);
    rotMat = SceneJS_math_rotationMat4v(dAngle, axis);
    eye1 = SceneJS_math_transformVector3(rotMat, eye0);
    tangent1 = SceneJS_math_transformVector3(rotMat, tangent0);
    tangentError = [0.0, 0.0, 0.0];
    SceneJS_math_mulVec3(tangent1, orbitUp, tangentError);
    SceneJS_math_subVec3(tangent1, tangentError);
    up1 = [0.0, 0.0, 0.0];
    SceneJS_math_cross3Vec3(eye1, tangent1, up1);
    return result = {
      eye: vec3ToRecord(eye1),
      look: lookAt.look,
      up: vec3ToRecord(up1)
    };
  };

  orbitLookAtNode = function(node, dAngles, orbitUp) {
    return node.set(orbitLookAt(dAngles, orbitUp, {
      eye: node.get('eye'),
      look: node.get('look'),
      up: node.get('up')
    }));
  };

  zoomLookAt = function(distance, limits, lookAt) {
    var eye0, eye0len, eye1, eye1len, look, result;
    eye0 = recordToVec3(lookAt.eye);
    look = recordToVec3(lookAt.look);
    eye0len = SceneJS_math_lenVec3(eye0);
    if (limits != null) {
      eye1len = Math.clamp(eye0len + distance, limits[0], limits[1]);
    } else {
      eye1len = eye0len + distance;
    }
    eye1 = [0.0, 0.0, 0.0];
    SceneJS_math_mulVec3Scalar(eye0, eye1len / eye0len, eye1);
    return result = {
      eye: vec3ToRecord(eye1),
      look: lookAt.look,
      up: lookAt.up
    };
  };

  zoomLookAtNode = function(node, distance, limits) {
    return node.set(zoomLookAt(distance, limits, {
      eye: node.get('eye'),
      look: node.get('look'),
      up: node.get('up')
    }));
  };

  gl = glQuery;

  constants = {
    canvas: {
      defaultSize: [512, 512]
    },
    camera: {
      maxOrbitSpeed: Math.PI * 0.1,
      orbitSpeedFactor: 0.02,
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

  windowResize = function() {};

  mouseDown = function(event) {
    if (!(state.scene != null)) return;
    state.viewport.mouse.last = [event.clientX, event.clientY];
    switch (event.which) {
      case 1:
        return state.viewport.mouse.leftDown = true;
      case 2:
        return state.viewport.mouse.middleDown = true;
    }
    /* Pick the object under the mouse
    if event.which == 1 # Left mouse button
      coords = mouseCoordsWithinElement event
      state.viewport.mouse.pickRecord = state.scene.pick coords[0], coords[1]
    */
  };

  mouseUp = function(event) {
    if (!(state.scene != null)) return;
    switch (event.which) {
      case 1:
        state.viewport.mouse.leftDown = false;
        return state.viewport.mouse.leftDragDistance = 0;
      case 2:
        state.viewport.mouse.middleDown = false;
        return state.viewport.mouse.middleDragDistance = 0;
    }
  };

  mouseMove = function(event) {
    /*
      # TODO: Get an accurate time measurement since the last mouseMove event
      # Get the delta position of the mouse over this frame
      delta = [event.clientX - state.viewport.mouse.last[0], event.clientY - state.viewport.mouse.last[1]]
      deltaLength = SceneJS_math_lenVec2 delta
    
      # Activate the appropriate mouse dragging mode
      state.viewport.mouse.leftDragDistance += deltaLength if state.viewport.mouse.leftDown
      state.viewport.mouse.middleDragDistance += deltaLength if state.viewport.mouse.middleDown
    
      if state.viewport.mouse.leftDown and event.which == 1
        # Calculate the orbit angle to apply to the lookAt
        orbitAngles = [0.0,0.0]
        SceneJS_math_mulVec2Scalar delta, constants.camera.orbitSpeedFactor / deltaLength, orbitAngles
        orbitAngles = [
          Math.clamp orbitAngles[0], -constants.camera.maxOrbitSpeed, constants.camera.maxOrbitSpeed
          Math.clamp orbitAngles[1], -constants.camera.maxOrbitSpeed, constants.camera.maxOrbitSpeed
        ]
        # Guard against bad delta values
        orbitAngles[0] = 0.0 if (isNaN orbitAngles[0]) or (Math.abs orbitAngles[0]) == Infinity
        orbitAngles[1] = 0.0 if (isNaN orbitAngles[1]) or (Math.abs orbitAngles[1]) == Infinity
        orbitLookAtNode (state.scene.findNode 'main-lookAt'), orbitAngles, [0.0,0.0,1.0]
    
      state.viewport.mouse.last = [event.clientX, event.clientY]
    */
  };

  mouseWheel = function(event) {
    /*
      # TODO: When the camera projection mode is ortho then this will need to scale the view
      # See http://www.javascriptkit.com/javatutors/onmousewheel.shtml
      # But also note, unfortunately firefox actually appears to give different values of event.detail some times.
      # It is likely that this is due to a user having changed his scroll speed settings, thus we'll clamp the value to 1 or -1
      delta = if event.wheelDelta? then event.wheelDelta / -120.0 else Math.clamp event.detail, -1.0, 1.0
    
      zoomDistance = delta * constants.camera.zoomSpeedFactor #* zoomLimits[1] 
      zoomLookAtNode (state.scene.findNode 'main-lookAt'), zoomDistance #, zoomLimits
    */
  };

  keyDown = function(event) {};

  controlsSourceCompile = function() {
    return sceneInit();
  };

  controlsParamChange = function(event) {
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
    return mecha.renderer.modelArguments('scene', model.args);
  };

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

  sceneIdle = function() {};

  canvasInit = function() {
    return windowResize();
  };

  sceneInit = function() {
    var csmSourceCode, requestId;
    csmSourceCode = mecha.generator.translateCSM(state.api.sourceCode, mecha.editor.getSourceCode());
    return requestId = JSandbox.eval({
      data: csmSourceCode,
      callback: function(result) {
        var attr, model, name, _ref;
        console.log(result);
        model = state.models['scene'];
        if (!(model != null)) {
          model = state.models['scene'] = {
            shaders: [],
            params: {},
            args: {}
          };
        }
        model.params = result.attr.params;
        _ref = model.params;
        for (name in _ref) {
          attr = _ref[name];
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
  };

  controlsInit = function() {
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
                  html += "<input name='" + param + "' id='" + param + "' class='mecha-param-range' type='range' min='" + val.start + "' max='" + val.end + "'" + stepAttr + "></input>";
                  break;
                case 'vec2':
                  stepAttr = val.step ? [" step='" + val.step[0] + "'", " step='" + val.step[1] + "'"] : ['', ''];
                  html += "<div><label for='" + param + "[0]'>x</label><input name='" + param + "[0]' id='" + param + "[0]' class='mecha-param-range' type='range' min='" + val.start[0] + "' max='" + val.end[0] + "'" + stepAttr[0] + "></input></div>";
                  html += "<div><label for='" + param + "[0]'>y</label><input name='" + param + "[1]' id='" + param + "[1]' class='mecha-param-range' type='range' min='" + val.start[1] + "' max='" + val.end[1] + "'" + stepAttr[1] + "></input></div>";
                  break;
                case 'vec3':
                  stepAttr = val.step ? [" step='" + val.step[0] + "'", " step='" + val.step[1] + "'", " step='" + val.step[2] + "'"] : ['', '', ''];
                  html += "<div><label for='" + param + "[0]'>x</label><input name='" + param + "[0]' id='" + param + "[0]' class='mecha-param-range' type='range' min='" + val.start[0] + "' max='" + val.end[0] + "'" + stepAttr[0] + "></input></div>";
                  html += "<div><label for='" + param + "[0]'>y</label><input name='" + param + "[1]' id='" + param + "[1]' class='mecha-param-range' type='range' min='" + val.start[1] + "' max='" + val.end[1] + "'" + stepAttr[1] + "></input></div>";
                  html += "<div><label for='" + param + "[0]'>z</label><input name='" + param + "[2]' id='" + param + "[2]' class='mecha-param-range' type='range' min='" + val.start[2] + "' max='" + val.end[2] + "'" + stepAttr[2] + "></input></div>";
                  break;
                case 'vec4':
                  stepAttr = val.step ? [" step='" + val.step[0] + "'", " step='" + val.step[1] + "'", " step='" + val.step[2] + "'", " step='" + val.step[3] + "'"] : ['', '', '', ''];
                  html += "<div><label for='" + param + "[0]'>x</label><input name='" + param + "[0]' id='" + param + "[0]' class='mecha-param-range' type='range' min='" + val.start[0] + "' max='" + val.end[0] + "'" + stepAttr[0] + "></input></div>";
                  html += "<div><label for='" + param + "[0]'>y</label><input name='" + param + "[1]' id='" + param + "[1]' class='mecha-param-range' type='range' min='" + val.start[1] + "' max='" + val.end[1] + "'" + stepAttr[1] + "></input></div>";
                  html += "<div><label for='" + param + "[0]'>z</label><input name='" + param + "[2]' id='" + param + "[2]' class='mecha-param-range' type='range' min='" + val.start[2] + "' max='" + val.end[2] + "'" + stepAttr[2] + "></input></div>";
                  html += "<div><label for='" + param + "[0]'>w</label><input name='" + param + "[3]' id='" + param + "[3]' class='mecha-param-range' type='range' min='" + val.start[3] + "' max='" + val.end[3] + "'" + stepAttr[3] + "></input></div>";
                  break;
                default:
                  mecha.logInternalError("Unknown range type `" + val.type + "` for parameter `" + param + "`.");
              }
              break;
            case 'number':
              switch (val.type) {
                case 'float':
                  html += "<input name='" + param + "' id='" + param + "' class='mecha-param-number' type='number'></input>";
                  break;
                case 'vec2':
                  html += "<div><label for='" + param + "[0]'>x</label><input name='" + param + "[0]' id='" + param + "[0]' class='mecha-param-number' type='number'></input></div>";
                  html += "<div><label for='" + param + "[0]'>y</label><input name='" + param + "[1]' id='" + param + "[1]' class='mecha-param-number' type='number'></input></div>";
                  break;
                case 'vec3':
                  html += "<div><label for='" + param + "[0]'>x</label><input name='" + param + "[0]' id='" + param + "[0]' class='mecha-param-number' type='number'></input></div>";
                  html += "<div><label for='" + param + "[1]'>y</label><input name='" + param + "[1]' id='" + param + "[1]' class='mecha-param-number' type='number'></input></div>";
                  html += "<div><label for='" + param + "[2]'>z</label><input name='" + param + "[2]' id='" + param + "[2]' class='mecha-param-number' type='number'></input></div>";
                  break;
                case 'vec4':
                  html += "<div><label for='" + param + "[0]'>x</label><input name='" + param + "[0]' id='" + param + "[0]' class='mecha-param-number' type='number'></input></div>";
                  html += "<div><label for='" + param + "[1]'>y</label><input name='" + param + "[1]' id='" + param + "[1]' class='mecha-param-number' type='number'></input></div>";
                  html += "<div><label for='" + param + "[2]'>z</label><input name='" + param + "[2]' id='" + param + "[2]' class='mecha-param-number' type='number'></input></div>";
                  html += "<div><label for='" + param + "[3]'>w</label><input name='" + param + "[3]' id='" + param + "[3]' class='mecha-param-number' type='number'></input></div>";
                  break;
                default:
                  mecha.logInternalError("Unknown number type `" + val.type + "` for parameter `" + param + "`.");
              }
          }
          html += "</td></tr>";
        }
      }
      html += '</table>';
      return el.innerHTML = html;
    }
  };

  apiInit = function(callback) {
    state.api.url = ($("link[rel='api']")).attr('href');
    return ($.get(encodeURIComponent(state.api.url), void 0, void 0, 'text')).success(function(data, textStatus, jqXHR) {
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

  create = function(container) {
    var containerEl, errorHtml;
    errorHtml = "<div>Could not create Mecha GUI. Please see the console for error messages.</div>";
    if (container !== null && typeof container !== 'string' && (typeof container !== 'object' || container.nodeName !== 'DIV')) {
      containerEl.innerHTML = errorHtml;
      mecha.logApiError("Mecha GUI: (ERROR) Invalid container id supplied, expected type 'string' or dom element of type 'DIV'.");
      return false;
    } else if (container === null) {
      mecha.logApiWarning("Mecha GUI: (WARNING) No container element supplied. Creating a div element here...");
    } else {
      containerEl = typeof container === 'string' ? document.getElementById(container) : container;
    }
    if (containerEl === null) {
      mecha.logApiError("Mecha GUI: (ERROR) Invalid container id supplied, could not find a matching 'DIV' element in the document.");
      return false;
    }
    containerEl.innerHTML = "<canvas id='mecha-canvas' width='512' height='512'>\n  <p>This application requires a browser that supports the<a href='http://www.w3.org/html/wg/html5/'>HTML5</a>&lt;canvas&gt; feature.</p>\n</canvas>" + containerEl.innerHTML;
    init(containerEl, document.getElementById('mecha-canvas'));
    return true;
  };

  createControls = function(container) {
    var containerEl;
    if (container !== null && typeof container !== 'string' && (typeof container !== 'object' || container.nodeName !== 'DIV')) {
      mecha.logApiError("Mecha GUI: (ERROR) Invalid container id supplied, expected type 'string' or dom element of type 'DIV'.");
      return false;
    } else if (container === null) {
      mecha.logApiWarning("Mecha GUI: (WARNING) No container element supplied. Creating a div element here...");
    } else {
      containerEl = typeof container === 'string' ? document.getElementById(container) : container;
    }
    if (containerEl === null) {
      mecha.logApiError("Mecha GUI: (ERROR) Invalid container id supplied, could not find a matching 'DIV' element in the document.");
      return false;
    }
    if (!(state.parameters.domElement != null)) {
      state.parameters.domElement = document.createElement('form');
      state.parameters.domElement.id = 'mecha-param-inputs';
      containerEl.appendChild(state.parameters.domElement);
    }
    controlsInit();
    return registerControlEvents();
  };

  exports = exports != null ? exports : {};

  exports.create = create;

  exports.createControls = createControls;

  return exports;

}).call(this);
