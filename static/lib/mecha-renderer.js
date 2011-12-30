/*
 * Copyright 2011, CircuitHub.com
 */
var mecha = mecha || {}; /* Redeclaring mecha is fine: behaves like a no-op (https://developer.mozilla.org/en/JavaScript/Reference/Scope_Cheatsheet) */

mecha.renderer = 
(function() {

  "use strict";

  var createScene, exports, lookAtToQuaternion, math_degToRad, math_invsqrt2, math_radToDeg, math_sqrt2, modifySubAttr, orbitLookAt, orbitLookAtNode, recordToVec3, recordToVec4, vec3ToRecord, vec4ToRecord, zoomLookAt, zoomLookAtNode;

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

  createScene = function() {
    return SceneJS.createScene({
      type: 'scene',
      id: 'Scene',
      canvasId: 'scenejsCanvas',
      loggingElementId: 'scenejsLog',
      flags: {
        backfaces: false
      },
      nodes: [
        {
          type: 'library',
          nodes: [
            {
              type: 'material',
              coreId: 'cube-mat',
              baseColor: {
                r: 0.64,
                b: 0.64,
                g: 0.64
              },
              emit: 0.0
            }, {
              type: 'geometry',
              coreId: 'cube-mesh',
              primitive: 'triangles',
              resource: 'cube-mesh',
              positions: [1.0, 1.0, -1.0, 1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, 1.0, -1.0, 1.0, 1.0, 1.0, 1.0, -1.0, 1.0, -1.0, -1.0, 1.0, -1.0, 1.0, 1.0, 1.0, 1.0, -1.0, 1.0, 1.0, 1.0, 1.0, -1.0, 1.0, 1.0, -1.0, -1.0, 1.0, -1.0, -1.0, 1.0, -1.0, 1.0, -1.0, -1.0, 1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, 1.0, -1.0, 1.0, 1.0, -1.0, 1.0, -1.0, 1.0, 1.0, 1.0, 1.0, 1.0, -1.0, -1.0, 1.0, -1.0, -1.0, 1.0, 1.0],
              normals: [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
              indices: [0, 1, 2, 0, 2, 3, 4, 7, 6, 4, 6, 5, 8, 9, 10, 8, 10, 11, 12, 13, 14, 12, 14, 15, 16, 17, 18, 16, 18, 19, 20, 21, 22, 20, 22, 23]
            }
          ]
        }, {
          type: 'lookAt',
          id: 'main-lookAt',
          eye: {
            y: -10.0,
            x: 10.0,
            z: 5.0
          },
          look: {
            y: 0.0,
            x: 0.0,
            z: 0.0
          },
          up: {
            y: 0.0,
            x: 0.0,
            z: 1.0
          },
          nodes: [
            {
              type: 'camera',
              id: 'main-camera',
              optics: {
                type: 'perspective',
                far: 100.0,
                near: 0.1,
                aspect: 1.0,
                fovy: 27.6380627952
              },
              nodes: [
                {
                  type: 'renderer',
                  id: 'main-renderer',
                  clear: {
                    color: true,
                    depth: true,
                    stencil: false
                  },
                  clearColor: {
                    r: 0.4,
                    b: 0.4,
                    g: 0.4
                  },
                  nodes: [
                    {
                      type: 'matrix',
                      id: 'light0-transform',
                      elements: [-0.290864378214, 0.955171227455, -0.055189050734, 0.0, -0.771100878716, -0.199883162975, 0.604524791241, 0.0, 0.566393375397, 0.218391060829, 0.794672250748, 0.0, 4.07624483109, 1.00545394421, 5.90386199951, 1.0],
                      nodes: [
                        {
                          type: 'light',
                          id: 'light0',
                          color: {
                            r: 1.0,
                            b: 1.0,
                            g: 1.0
                          },
                          pos: {
                            y: 0.0,
                            x: 0.0,
                            z: 0.0
                          },
                          quadraticAttenuation: 0.000555556,
                          linearAttenuation: 0.0,
                          mode: 'point',
                          constantAttenuation: 1.0
                        }
                      ]
                    }, {
                      type: 'matrix',
                      id: 'light1-transform',
                      elements: [1.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0, 1.32968401909, -2.12760996819, 2.74223303795, 1.0],
                      nodes: [
                        {
                          type: 'light',
                          id: 'light1',
                          color: {
                            r: 1.0,
                            b: 1.0,
                            g: 1.0
                          },
                          pos: {
                            y: 0.0,
                            x: 0.0,
                            z: 0.0
                          },
                          quadraticAttenuation: 0.0008,
                          linearAttenuation: 0.0,
                          mode: 'point',
                          constantAttenuation: 1.0
                        }
                      ]
                    }, {
                      type: 'matrix',
                      id: 'cube-transform',
                      elements: [1.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 0.0, 1.0],
                      nodes: [
                        {
                          type: 'material',
                          coreId: 'cube-mat',
                          id: 'cube-mat',
                          nodes: [
                            {
                              type: 'geometry',
                              coreId: 'cube-mesh'
                            }
                          ]
                        }
                      ]
                    }
                  ]
                }
              ]
            }
          ]
        }
      ]
    });
  };

  exports = exports != null ? exports : {};

  exports.createScene = createScene;

  return exports;

}).call(this);
