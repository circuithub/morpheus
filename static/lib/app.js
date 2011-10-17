/*
 * Copyright header comes here
 */
"use strict";

(function() {
  var box, canvasInit, compileASM, compileGLSL, constants, controlsInit, controlsSourceCompile, cylinder, keyDown, lookAtToQuaternion, modifySubAttr, mouseCoordsWithinElement, mouseDown, mouseMove, mouseUp, mouseWheel, orbitLookAt, orbitLookAtNode, recordToVec3, recordToVec4, registerControlEvents, registerDOMEvents, sceneIdle, sceneInit, sphere, state, vec3ToRecord, vec4ToRecord, windowResize, zoomLookAt, zoomLookAtNode;
  var __slice = Array.prototype.slice;
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
  box = function() {
    var attr, node, nodes, _i, _len, _results;
    attr = arguments[0], nodes = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
    console.log(attr);
    _results = [];
    for (_i = 0, _len = nodes.length; _i < _len; _i++) {
      node = nodes[_i];
      _results.push(console.log(node));
    }
    return _results;
  };
  cylinder = function() {
    var attr, node, nodes, _i, _len, _results;
    attr = arguments[0], nodes = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
    console.log(attr);
    _results = [];
    for (_i = 0, _len = nodes.length; _i < _len; _i++) {
      node = nodes[_i];
      _results.push(console.log(node));
    }
    return _results;
  };
  sphere = function() {
    var attr, node, nodes, _i, _len, _results;
    attr = arguments[0], nodes = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
    console.log(attr);
    _results = [];
    for (_i = 0, _len = nodes.length; _i < _len; _i++) {
      node = nodes[_i];
      _results.push(console.log(node));
    }
    return _results;
  };
  compileASM = function(concreteSolidModel) {
    return {};
  };
  compileGLSL = function(abstractSolidModel) {
    return '#ifdef GL_ES\n  precision highp float;\n#endif\n\n//attribute vec3 SCENEJS_aVertex;           // Model coordinates\nuniform vec3 SCENEJS_uEye;                  // World-space eye position\nvarying vec3 SCENEJS_vEyeVec;               // Output world-space eye vector\n// attribute vec3 SCENEJS_aNormal;          // Normal vectors\n// uniform   mat4 SCENEJS_uMNMatrix;        // Model normal matrix\n// uniform   mat4 SCENEJS_uVNMatrix;        // View normal matrix\n// varying   vec3 SCENEJS_vWorldNormal;     // Output world-space vertex normal\n// varying   vec3 SCENEJS_vViewNormal;      // Output view-space vertex normal\n// uniform vec3 SCENEJS_uLightDir0;\n// uniform vec4 SCENEJS_uLightPos0;\n// uniform vec4 SCENEJS_uLightPos0;\n// varying vec4 SCENEJS_vLightVecAndDist0;  // varying for fragment lighting\n// attribute vec2 SCENEJS_aUVCoord;         // UV coords\n// attribute vec2 SCENEJS_aUVCoord2;        // UV2 coords\n// attribute vec4 SCENEJS_aVertexColor;     // UV2 coords\n// varying vec4 SCENEJS_vColor;             // Varying for fragment texturing\n// uniform mat4 SCENEJS_uMMatrix;           // Model matrix\n// uniform mat4 SCENEJS_uVMatrix;           // View matrix\n// uniform mat4 SCENEJS_uPMatrix;           // Projection matrix\nvarying vec4 SCENEJS_vWorldVertex;          // Varying for fragment clip or world pos hook\n// varying vec4 SCENEJS_vViewVertex;        // Varying for fragment view clip hook\n// varying vec2 SCENEJS_vUVCoord;\n// varying vec2 SCENEJS_vUVCoord2;\nuniform float radius;\n\nfloat sceneRayDist(in vec3 p, in float r, in vec3 d) {\n  return length(p)-r;\n}\nfloat sphereDist(in vec3 p, in float r) {\n  return length(p)-r;\n}\nfloat _intersect(in float a, in float b) {\n  return max(a,b);\n}\nfloat _difference(in float a, in float b) {\n  return max(a,-b);\n}\nfloat _union(in float a, in float b) {\n  return min(a,b);\n}\n\nfloat sceneDist(in vec3 rayOrigin){\n  /*return sphereDist(vec3(0.0,0.0,0.0)-rayOrigin, 0.99);*/\n  return _union(sphereDist(rayOrigin - vec3(0.5,0.0,0.0), 0.49), sphereDist(rayOrigin - vec3(-0.5,0.0,0.0), 0.49));\n  /*return _difference(sphereDist(vec3(0.5,0.0,0.0) - rayOrigin, 0.49), sphereDist(vec3(-0.5,0.0,0.0) - rayOrigin, 0.49));*/\n}\n\nfloat sceneRayDist(in vec3 rayOrigin, in vec3 rayDir) {\n  /*return sceneRayDist(vec3(0.0,0.0,0.0)-rayOrigin, 0.99, rayDir);*/\n  return _union(sceneRayDist(rayOrigin - vec3(0.5,0.0,0.0), 0.49, rayDir), sceneRayDist(rayOrigin - vec3(-0.5,0.0,0.0), 0.49, rayDir));\n  /*return _difference(rayOrigin - sceneRayDist(vec3(0.5,0.0,0.0), 0.49, rayDir), sceneRayDist(rayOrigin - vec3(-0.5,0.0,0.0), 0.49, rayDir));*/\n}\n\nvec3 sceneNormal( in vec3 pos )\n{\n  const float eps = 0.0001;\n  vec3 n;\n  n.x = sceneDist( vec3(pos.x+eps, pos.yz) ) - sceneDist( vec3(pos.x-eps, pos.yz) );\n  n.y = sceneDist( vec3(pos.x, pos.y+eps, pos.z) ) - sceneDist( vec3(pos.x, pos.y-eps, pos.z) );\n  n.z = sceneDist( vec3(pos.xy, pos.z+eps) ) - sceneDist( vec3(pos.xy, pos.z-eps) );\n  return normalize(n);\n}\nvoid main(void) {\n  const int steps = 64;\n  const float threshold = 0.01;\n  vec3 rayDir = /*normalize*/(/*SCENEJS_uMMatrix * */ SCENEJS_vEyeVec);\n  vec3 rayOrigin = SCENEJS_vWorldVertex.xyz;\n  bool hit = false;\n  float dist = 0.0;\n  for(int i = 0; i < steps; i++) {\n    dist = sceneRayDist(rayOrigin, rayDir);\n    if (dist < threshold) {\n      hit = true;\n      break;\n    }\n    rayOrigin += dist * rayDir;\n  }\n  if(!hit) { discard; }\n  /*if(!hit) { gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0); return; }*/\n  const vec3 diffuseColor = vec3(0.1, 0.2, 0.8);\n  const vec3 lightPos = vec3(0.8,4.0, 0.8);\n  vec3 ldir = normalize(lightPos - rayOrigin);\n  vec3 diffuse = diffuseColor * dot(sceneNormal(rayOrigin), ldir);\n  gl_FragColor = vec4(diffuse, 1.0);\n}';
  };
  constants = {
    canvas: {
      defaultSize: [512, 512]
    },
    camera: {
      maxOrbitSpeed: Math.PI * 0.1,
      orbitSpeedFactor: 0.01,
      zoomSpeedFactor: 0.5
    }
  };
  Math.clamp = function(s, min, max) {
    return Math.min(Math.max(s, min), max);
  };
  state = {
    scene: SceneJS.scene('Scene'),
    canvas: document.getElementById('scenejsCanvas'),
    viewport: {
      domElement: document.getElementById('viewport'),
      mouse: {
        last: [0, 0],
        leftDragging: false,
        middleDragging: false
      }
    },
    application: {
      initialized: false
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
    switch (event.which) {
      case 1:
        return state.viewport.mouse.leftDragging = true;
    }
  };
  mouseUp = function(event) {
    return state.viewport.mouse.leftDragging = false;
  };
  mouseMove = function(event) {
    var delta, deltaLength, orbitAngles;
    if (state.viewport.mouse.leftDragging) {
      delta = [event.clientX - state.viewport.mouse.last[0], event.clientY - state.viewport.mouse.last[1]];
      deltaLength = SceneJS_math_lenVec2(delta);
      orbitAngles = [0.0, 0.0];
      SceneJS_math_mulVec2Scalar(delta, constants.camera.orbitSpeedFactor / deltaLength, orbitAngles);
      orbitAngles = [Math.clamp(orbitAngles[0], -constants.camera.maxOrbitSpeed, constants.camera.maxOrbitSpeed), Math.clamp(orbitAngles[1], -constants.camera.maxOrbitSpeed, constants.camera.maxOrbitSpeed)];
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
    try {
      return (state.scene.findNode('main-shader')).set('shaders', [
        {
          stage: 'fragment',
          code: compileGLSL(compileASM(($('#source-code')).val()))
        }
      ]);
    } catch (error) {
      if ((typeof console !== "undefined" && console !== null) && (console.log != null)) {
        return console.log(error);
      }
    }
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
    var shaderDef;
    shaderDef = {
      type: 'shader',
      id: 'main-shader',
      shaders: [
        {
          stage: 'fragment',
          code: compileGLSL(compileASM({}))
        }
      ],
      vars: {}
    };
    return (state.scene.findNode('cube-mat')).insert('node', shaderDef);
  };
  controlsInit = function() {};
  canvasInit();
  sceneInit();
  state.scene.start({
    idleFunc: sceneIdle
  });
  $(function() {
    controlsInit();
    registerDOMEvents();
    registerControlEvents();
    return state.application.initialized = true;
  });
}).call(this);
