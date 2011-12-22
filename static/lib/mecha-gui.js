/*
 * Copyright 2011, CircuitHub.com
 */
var mecha = mecha || {};

mecha.gui = 
(function() {

  "use strict";

  var apiInit, canvasInit, controlsInit, controlsSourceCompile, exports, keyDown, lookAtToQuaternion, modifySubAttr, mouseCoordsWithinElement, mouseDown, mouseMove, mouseUp, mouseWheel, orbitLookAt, orbitLookAtNode, recordToVec3, recordToVec4, registerControlEvents, registerDOMEvents, sceneIdle, sceneInit, vec3ToRecord, vec4ToRecord, windowResize, zoomLookAt, zoomLookAtNode;

  Math.clamp = function(s, min, max) {
    return Math.min(Math.max(s, min), max);
  };

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

  mecha.log = ((typeof console !== "undefined" && console !== null) && (console.log != null) ? function() {
    return console.log.apply(console, arguments);
  } : function() {});

  mecha.logInternalError = ((typeof console !== "undefined" && console !== null) && (console.log != null) ? function() {
    return console.log.apply(console, arguments);
  } : function() {});

  mecha.logApiError = ((typeof console !== "undefined" && console !== null) && (console.log != null) ? function() {
    return console.log.apply(console, arguments);
  } : function() {});

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
    var coords;
    if (!(state.scene != null)) return;
    state.viewport.mouse.last = [event.clientX, event.clientY];
    switch (event.which) {
      case 1:
        state.viewport.mouse.leftDown = true;
        break;
      case 2:
        state.viewport.mouse.middleDown = true;
    }
    if (event.which === 1) {
      coords = mouseCoordsWithinElement(event);
      return state.viewport.mouse.pickRecord = state.scene.pick(coords[0], coords[1]);
    }
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
    var delta, deltaLength, orbitAngles;
    delta = [event.clientX - state.viewport.mouse.last[0], event.clientY - state.viewport.mouse.last[1]];
    deltaLength = SceneJS_math_lenVec2(delta);
    if (state.viewport.mouse.leftDown) {
      state.viewport.mouse.leftDragDistance += deltaLength;
    }
    if (state.viewport.mouse.middleDown) {
      state.viewport.mouse.middleDragDistance += deltaLength;
    }
    if (state.viewport.mouse.leftDown && event.which === 1) {
      orbitAngles = [0.0, 0.0];
      SceneJS_math_mulVec2Scalar(delta, constants.camera.orbitSpeedFactor / deltaLength, orbitAngles);
      orbitAngles = [Math.clamp(orbitAngles[0], -constants.camera.maxOrbitSpeed, constants.camera.maxOrbitSpeed), Math.clamp(orbitAngles[1], -constants.camera.maxOrbitSpeed, constants.camera.maxOrbitSpeed)];
      if ((isNaN(orbitAngles[0])) || (Math.abs(orbitAngles[0])) === Infinity) {
        orbitAngles[0] = 0.0;
      }
      if ((isNaN(orbitAngles[1])) || (Math.abs(orbitAngles[1])) === Infinity) {
        orbitAngles[1] = 0.0;
      }
      orbitLookAtNode(state.scene.findNode('main-lookAt'), orbitAngles, [0.0, 0.0, 1.0]);
    }
    return state.viewport.mouse.last = [event.clientX, event.clientY];
  };

  mouseWheel = function(event) {
    var delta, zoomDistance;
    delta = event.wheelDelta != null ? event.wheelDelta / -120.0 : Math.clamp(event.detail, -1.0, 1.0);
    zoomDistance = delta * constants.camera.zoomSpeedFactor;
    return zoomLookAtNode(state.scene.findNode('main-lookAt'), zoomDistance);
  };

  keyDown = function(event) {};

  controlsSourceCompile = function() {
    return sceneInit();
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

  registerControlEvents = function() {
    return ($('#source-compile')).click(controlsSourceCompile);
  };

  sceneIdle = function() {};

  canvasInit = function() {
    return windowResize();
  };

  sceneInit = function() {
    return compileCSM(($('#source-code')).val(), function(result) {
      var shaderDef, shaders;
      shaders = compileGLSL(compileASM(result));
      shaderDef = {
        type: 'shader',
        id: 'main-shader',
        shaders: [
          {
            stage: 'fragment',
            code: shaders[1]
          }
        ],
        vars: {}
      };
      return (state.scene.findNode('cube-mat')).insert('node', shaderDef);
    });
  };

  controlsInit = function() {};

  apiInit = function() {
    state.api.url = ($("link[rel='api']")).attr('href');
    return ($.get(encodeURIComponent(state.api.url, void 0, void 0, 'text'))).success(function(data, textStatus, jqXHR) {
      state.api.sourceCode = data;
      return mecha.log("Loaded " + state.api.url);
    }).error(function() {
      return mecha.log("Error loading API script");
    });
  };

  canvasInit();

  state.scene.start({
    idleFunc: sceneIdle
  });

  $(function() {
    apiInit();
    controlsInit();
    registerDOMEvents();
    registerControlEvents();
    return state.application.initialized = true;
  });

  exports = exports != null ? exports : {};

  return exports;

}).call(this);
