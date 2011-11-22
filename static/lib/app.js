/*
 * Copyright 2011, CircuitHub.com
 */
"use strict";

(function() {
  var apiInit, asm, canvasInit, collectASM, compileASM, compileCSM, compileGLSL, constants, controlsInit, controlsSourceCompile, glslLibrary, keyDown, lookAtToQuaternion, mapASM, mapCollectASM, mecha, modifySubAttr, mouseCoordsWithinElement, mouseDown, mouseMove, mouseUp, mouseWheel, optimizeASM, orbitLookAt, orbitLookAtNode, recordToVec3, recordToVec4, registerControlEvents, registerDOMEvents, sceneIdle, sceneInit, state, vec3ToRecord, vec4ToRecord, windowResize, zoomLookAt, zoomLookAtNode;
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
  mecha = {};
  mecha.log = ((typeof console !== "undefined" && console !== null) && (console.log != null) ? function() {
    return console.log.apply(console, arguments);
  } : function() {});
  mecha.logInternalError = ((typeof console !== "undefined" && console !== null) && (console.log != null) ? function() {
    return console.log.apply(console, arguments);
  } : function() {});
  mecha.logApiError = ((typeof console !== "undefined" && console !== null) && (console.log != null) ? function() {
    return console.log.apply(console, arguments);
  } : function() {});
  Array.prototype.flatten = function() {
    var x, _ref;
    return (_ref = []).concat.apply(_ref, (function() {
      var _i, _len, _results;
      _results = [];
      for (_i = 0, _len = this.length; _i < _len; _i++) {
        x = this[_i];
        _results.push((Array.isArray(x) ? flatten(x) : [x]));
      }
      return _results;
    }).call(this));
  };
  Array.prototype.shallowClone = function() {
    return this.slice(0);
  };
  Math.clamp = function(s, min, max) {
    return Math.min(Math.max(s, min), max);
  };
  compileCSM = function(source, callback) {
    var postfix, prefix, requestId;
    prefix = '(function(){\n  /* BEGIN API */\n  ' + state.api.sourceCode + '  try {\n  /* BEGIN SOURCE */\n  return scene(\n';
    postfix = '  \n  );\n  } catch(err) {\n    return String(err);\n  }\n})();';
    return requestId = JSandbox.eval({
      data: prefix + source + postfix,
      callback: function(result) {
        console.log(result);
        return callback(result);
      },
      onerror: function(data, request) {
        return mecha.logInternalError("Error compiling the solid model.");
      }
    });
  };
  asm = {
    union: function() {
      var nodes;
      nodes = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
      return {
        type: 'union',
        nodes: nodes.flatten()
      };
    },
    intersect: function() {
      var flattenedNodes, n, nodes, result, _i, _len;
      nodes = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
      flattenedNodes = nodes.flatten();
      result = {
        type: 'intersect',
        nodes: (function() {
          var _i, _len, _results;
          _results = [];
          for (_i = 0, _len = flattenedNodes.length; _i < _len; _i++) {
            n = flattenedNodes[_i];
            if (n.type !== 'intersect') {
              _results.push(n);
            }
          }
          return _results;
        })()
      };
      for (_i = 0, _len = flattenedNodes.length; _i < _len; _i++) {
        n = flattenedNodes[_i];
        if (n.type === 'intersect') {
          result.nodes = result.nodes.concat(n.nodes);
        }
      }
      return result;
    },
    invert: function() {
      var nodes;
      nodes = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
      return {
        type: 'invert',
        nodes: nodes.flatten()
      };
    },
    mirror: function() {
      var attr, nodes;
      attr = arguments[0], nodes = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
      return {
        type: 'mirror',
        attr: attr,
        nodes: nodes.flatten()
      };
    },
    translate: function() {
      var attr, nodes;
      attr = arguments[0], nodes = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
      return {
        type: 'translate',
        attr: attr,
        nodes: nodes.flatten()
      };
    },
    halfspace: function(attr) {
      return {
        type: 'halfspace',
        attr: attr
      };
    },
    cylinder: function(attr) {
      return {
        type: 'cylinder',
        attr: attr
      };
    },
    sphere: function(attr) {
      return {
        type: 'sphere',
        attr: attr
      };
    }
  };
  mapCollectASM = function(nodes, flags, params, dispatch) {
    var node, parentTranslation, _i, _len, _results;
    _results = [];
    for (_i = 0, _len = nodes.length; _i < _len; _i++) {
      node = nodes[_i];
      _results.push((function() {
        switch (node.type) {
          case 'invert':
            flags.invert = !flags.invert;
            if (dispatch[node.type] != null) {
              dispatch[node.type](node, flags, params);
            }
            mapCollectASM(node.nodes, flags, params, dispatch);
            return flags.invert = !flags.invert;
          case 'translate':
            parentTranslation = flags.translation;
            flags.translation = node.attr.offset;
            mapCollectASM(node.nodes, flags, params, dispatch);
            return flags.translation = parentTranslation;
          default:
            if (dispatch[node.type] != null) {
              return dispatch[node.type](node, flags, params);
            } else {
              if (dispatch["default"] !== null) {
                return dispatch["default"](node, flags, params);
              }
            }
        }
      })());
    }
    return _results;
  };
  collectASM = {
    intersect: function(nodes, flags, halfSpaceBins) {
      return mapCollectASM(nodes, flags, {
        halfSpaceBins: halfSpaceBins
      }, {
        halfspace: function(node, flags, params) {
          return params.halfSpaceBins[node.attr.axis + (flags.invert ? 3 : 0)].push(node.attr.val);
        },
        mirror: function() {},
        "default": function(node) {
          return mecha.logInternalError("ASM Collect: Unsupported node type, '" + node.type + "', inside intersection.");
        }
      });
    }
  };
  mapASM = function(preDispatch, postDispatch, stack, node, flags) {
    var n, resultNode, _i, _len, _ref;
    stack.reverse();
    resultNode = {
      type: node.type,
      attr: node.attr,
      nodes: []
    };
    if (preDispatch[node.type] != null) {
      preDispatch[node.type](stack, resultNode, flags);
    } else {
      preDispatch['default'](stack, resultNode, flags);
    }
    stack.reverse();
    stack.push(resultNode);
    _ref = node.nodes || [];
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      n = _ref[_i];
      mapASM(preDispatch, postDispatch, stack, n, flags);
    }
    stack.pop();
    stack.reverse();
    if (postDispatch[node.type] != null) {
      postDispatch[node.type](stack, resultNode, flags);
    } else {
      postDispatch['default'](stack, resultNode, flags);
    }
    stack.reverse();
    return stack[0];
  };
  optimizeASM = function(node, flags) {
    var postDispatch, preDispatch, resultNode;
    resultNode = {};
    if (!(flags != null)) {
      flags = {
        invert: false
      };
    }
    preDispatch = {
      invert: function(stack, node, flags) {
        return flags.invert = !flags.invert;
      },
      "default": function(stack, node, flags) {}
    };
    postDispatch = {
      invert: function(stack, node, flags) {
        flags.invert = !flags.invert;
        return stack[0].nodes.push(node);
      },
      union: function(stack, node, flags) {
        var s, _i, _len;
        for (_i = 0, _len = stack.length; _i < _len; _i++) {
          s = stack[_i];
          switch (s.type) {
            case 'union':
              stack[0].nodes = stack[0].nodes.concat(node.nodes);
              return;
            case 'invert':
            case 'mirror':
            case 'translate':
              continue;
          }
          break;
        }
        return stack[0].nodes.push(node);
      },
      intersect: function(stack, node, flags) {
        var s, _i, _len;
        for (_i = 0, _len = stack.length; _i < _len; _i++) {
          s = stack[_i];
          switch (s.type) {
            case 'intersect':
              stack[0].nodes = stack[0].nodes.concat(node.nodes);
              return;
            case 'invert':
            case 'mirror':
            case 'translate':
              continue;
          }
          break;
        }
        return stack[0].nodes.push(node);
      },
      translate: function(stack, node, flags) {
        return stack[0].nodes.push(node);
      },
      halfspace: function(stack, node, flags) {
        var n, s, _i, _j, _len, _len2, _ref;
        if (node.nodes.length > 0) {
          mecha.logInternalError("ASM Optimize: Unexpected child nodes found in halfspace node.");
        }
        for (_i = 0, _len = stack.length; _i < _len; _i++) {
          s = stack[_i];
          switch (s.type) {
            case 'intersect':
              _ref = s.nodes;
              for (_j = 0, _len2 = _ref.length; _j < _len2; _j++) {
                n = _ref[_j];
                if (n.type === 'halfspace' && n.attr.axis === node.attr.axis) {
                  if ((n.attr.val < node.attr.val && flags.invert) || (n.attr.val > node.attr.val && !flags.invert)) {
                    n.attr = node.attr;
                  }
                  return;
                }
              }
          }
          break;
        }
        return stack[0].nodes.push(node);
      },
      "default": function(stack, node, flags) {
        return stack[0].nodes.push(node);
      }
    };
    return mapASM(preDispatch, postDispatch, [
      {
        type: 'union',
        nodes: []
      }
    ], node, flags);
  };
  compileASM = function(concreteSolidModel) {
    var compileASMNode, dispatch;
    dispatch = {
      scene: function(node) {
        var n;
        if (node.nodes.length > 1) {
          return asm.union.apply(asm, (function() {
            var _i, _len, _ref, _results;
            _ref = node.nodes;
            _results = [];
            for (_i = 0, _len = _ref.length; _i < _len; _i++) {
              n = _ref[_i];
              _results.push(compileASMNode(n));
            }
            return _results;
          })());
        } else if (node.nodes.length === 1) {
          return compileASMNode(node.nodes[0]);
        } else {
          return {};
        }
      },
      box: function(node) {
        var halfspaces;
        halfspaces = [
          asm.halfspace({
            val: node.attr.dimensions[0] * -0.5,
            axis: 0
          }), asm.halfspace({
            val: node.attr.dimensions[1] * -0.5,
            axis: 1
          }), asm.halfspace({
            val: node.attr.dimensions[2] * -0.5,
            axis: 2
          }), asm.halfspace({
            val: node.attr.dimensions[0] * 0.5,
            axis: 0
          }), asm.halfspace({
            val: node.attr.dimensions[1] * 0.5,
            axis: 1
          }), asm.halfspace({
            val: node.attr.dimensions[2] * 0.5,
            axis: 2
          })
        ];
        return asm.intersect(halfspaces[0], halfspaces[1], halfspaces[2], asm.invert.apply(asm, halfspaces.slice(3, 7)));
      },
      sphere: function(node) {
        return asm.sphere({
          radius: node.attr.radius
        });
      },
      cylinder: function(node) {
        var halfspaces;
        halfspaces = [
          asm.halfspace({
            val: node.attr.length * -0.5,
            axis: node.attr.axis
          }), asm.invert(asm.halfspace({
            val: node.attr.length * 0.5,
            axis: node.attr.axis
          }))
        ];
        return asm.intersect(asm.cylinder({
          radius: node.attr.radius,
          axis: node.attr.axis
        }), halfspaces[0], halfspaces[1]);
      },
      intersect: function(node) {
        var n;
        return asm.intersect.apply(asm, (function() {
          var _i, _len, _ref, _results;
          _ref = node.nodes;
          _results = [];
          for (_i = 0, _len = _ref.length; _i < _len; _i++) {
            n = _ref[_i];
            _results.push(compileASMNode(n));
          }
          return _results;
        })());
      },
      union: function(node) {
        var n;
        return asm.union.apply(asm, (function() {
          var _i, _len, _ref, _results;
          _ref = node.nodes;
          _results = [];
          for (_i = 0, _len = _ref.length; _i < _len; _i++) {
            n = _ref[_i];
            _results.push(compileASMNode(n));
          }
          return _results;
        })());
      },
      difference: function(node) {
        var n;
        if (node.nodes.length > 0) {
          return asm.intersect(compileASMNode(node.nodes[0], asm.invert.apply(asm, (function() {
            var _i, _len, _ref, _results;
            _ref = node.nodes.slice(1, (node.nodes.length + 1) || 9e9);
            _results = [];
            for (_i = 0, _len = _ref.length; _i < _len; _i++) {
              n = _ref[_i];
              _results.push(compileASMNode(n));
            }
            return _results;
          })())));
        } else {
          return asm.intersect();
        }
      },
      translate: function(node) {
        var n;
        return asm.translate.apply(asm, [node.attr].concat(__slice.call((function() {
          var _i, _len, _ref, _results;
          _ref = node.nodes;
          _results = [];
          for (_i = 0, _len = _ref.length; _i < _len; _i++) {
            n = _ref[_i];
            _results.push(compileASMNode(n));
          }
          return _results;
        })())));
      }
    };
    compileASMNode = function(node) {
      switch (typeof node) {
        case 'object':
          if (dispatch[node.type] != null) {
            return dispatch[node.type](node);
          } else {
            mecha.log("Unexpected node type '" + node.type + "'.");
            return {};
          }
          break;
        default:
          mecha.log("Unexpected node of type '" + (typeof node) + "'.");
          return {};
      }
    };
    if (concreteSolidModel.type !== 'scene') {
      mecha.log("Expected node of type 'scene' at the root of the solid model, instead, got '" + concreteSolidModel.type + "'.");
      return;
    }
    return optimizeASM(compileASMNode(concreteSolidModel));
  };
  glslLibrary = {
    distanceFunctions: {
      sphereDist: {
        id: '_sphereDist',
        returnType: 'float',
        arguments: ['vec3', 'float'],
        code: (function() {
          var position, radius;
          position = 'a';
          radius = 'b';
          return ["return length(" + position + ") - " + radius + ";"];
        })()
      },
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
        })(),
        intersectDist: {
          id: '__intersectDist',
          arguments: ['float', 'float'],
          code: ["return max(a,b);"]
        },
        differenceDist: {
          id: '__differenceDist',
          arguments: ['float', 'float'],
          code: ["return max(a,-b);"]
        },
        unionDist: {
          id: '__unionDist',
          arguments: ['float', 'float'],
          code: ["return min(a,b);"]
        }
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
          if (i < distanceFunction.arguments.length - 1) {
            code += ',';
          }
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
  compileGLSL = function(abstractSolidModel) {
    var compileCorner, flags, main, postDispatch, preDispatch, prefix, preludePop, preludePush, program, rayDirection, rayOrigin, result, sceneDist, sceneNormal, sceneRayDist, uniforms;
    prefix = '#ifdef GL_ES\n  precision highp float;\n#endif\nuniform vec3 SCENEJS_uEye;                  // World-space eye position\nvarying vec3 SCENEJS_vEyeVec;               // Output world-space eye vector\nvarying vec4 SCENEJS_vWorldVertex;          // Varying for fragment clip or world pos hook\n';
    uniforms = "";
    rayOrigin = 'ro';
    rayDirection = 'rd';
    sceneDist = function(prelude, code) {
      return "\nfloat sceneDist(in vec3 " + rayOrigin + "){\n" + prelude + "  return max(0.0," + code + ");\n}\n\n";
    };
    sceneRayDist = 'float sceneRayDist(in vec3 ro, in vec3 rd) {\n  return 0.0;\n}\n';
    sceneNormal = 'vec3 sceneNormal(in vec3 p) {\n  const float eps = 0.0001;\n  vec3 n;\n  n.x = sceneDist( vec3(p.x+eps, p.yz) ) - sceneDist( vec3(p.x-eps, p.yz) );\n  n.y = sceneDist( vec3(p.x, p.y+eps, p.z) ) - sceneDist( vec3(p.x, p.y-eps, p.z) );\n  n.z = sceneDist( vec3(p.xy, p.z+eps) ) - sceneDist( vec3(p.xy, p.z-eps) );\n  return normalize(n);\n}\n';
    main = 'void main(void) {\n  const int steps = 64;\n  const float threshold = 0.01;\n  vec3 rayDir = /*normalize*/(/*SCENEJS_uMMatrix * */ -SCENEJS_vEyeVec);\n  vec3 rayOrigin = SCENEJS_vWorldVertex.xyz;\n  bool hit = false;\n  float dist = 0.0;\n  for(int i = 0; i < steps; i++) {\n    //dist = sceneRayDist(rayOrigin, rayDir);\n    dist = sceneDist(rayOrigin);\n    if (dist < threshold) {\n      hit = true;\n      break;\n    }\n    rayOrigin += dist * rayDir;\n  }\n  if(!hit) { discard; }\n  /*if(!hit) { gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0); return; }*/\n  const vec3 diffuseColor = vec3(0.1, 0.2, 0.8);\n  /*const vec3 specularColor = vec3(1.0, 1.0, 1.0);*/\n  const vec3 lightPos = vec3(1.5,1.5, 4.0);\n  vec3 ldir = normalize(lightPos - rayOrigin);\n  vec3 diffuse = diffuseColor * dot(sceneNormal(rayOrigin), ldir);\n  gl_FragColor = vec4(diffuse, 1.0);\n}\n';
    preludePush = function(prelude, value) {
      var name;
      name = 'r' + prelude.counter;
      prelude.push([name, value]);
      prelude.counter += 1;
      prelude.code += "  vec3 " + name + " = " + value + ";\n";
      return name;
    };
    preludePop = function(prelude) {
      return prelude.pop()[0];
    };
    preDispatch = {
      invert: function(stack, node, flags) {
        return flags.invert = !flags.invert;
      },
      intersect: function(stack, node, flags) {
        var i, _results;
        node.halfSpaces = [];
        _results = [];
        for (i = 0; i <= 5; i++) {
          _results.push(node.halfSpaces.push(null));
        }
        return _results;
      },
      union: function(stack, node, flags) {
        var i, _results;
        node.halfSpaces = [];
        _results = [];
        for (i = 0; i <= 5; i++) {
          _results.push(node.halfSpaces.push(null));
        }
        return _results;
      },
      translate: function(stack, node, flags) {
        var ro;
        ro = flags.glslPrelude[flags.glslPrelude.length - 1][0];
        return preludePush(flags.glslPrelude, "" + ro + " - vec3(" + node.attr.offset[0] + ", " + node.attr.offset[1] + ", " + node.attr.offset[2] + ")");
      },
      "default": function(stack, node, flags) {}
    };
    compileCorner = function(ro, flags, state) {
      var cornerSize, cornerWithSigns, dist, h, index, remainingHalfSpaces, roWithSigns, signs, _i, _len, _ref;
      remainingHalfSpaces = 0;
      _ref = state.hs;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        h = _ref[_i];
        if (h !== null) {
          remainingHalfSpaces += 1;
        }
      }
      if (remainingHalfSpaces === 1) {
        for (index = 0; index <= 5; index++) {
          if (state.hs[index] !== null) {
            state.codes.push((index > 2 ? "" + ro + "[" + (index - 3) + "] - " + state.hs[index] : "-" + ro + "[" + index + "] + " + state.hs[index]));
            state.hs[index] = null;
            break;
          }
        }
        remainingHalfSpaces -= 1;
      } else if (remainingHalfSpaces > 1) {
        cornerSize = [state.hs[0] !== null ? state.hs[0] : state.hs[3] !== null ? state.hs[3] : 0, state.hs[1] !== null ? state.hs[1] : state.hs[4] !== null ? state.hs[4] : 0, state.hs[2] !== null ? state.hs[2] : state.hs[5] !== null ? state.hs[5] : 0];
        signs = [state.hs[0] !== null, state.hs[1] !== null, state.hs[2] !== null];
        roWithSigns = !(signs[0] || signs[1] || signs[2]) ? "" + ro : (signs[0] || state.hs[3] === null) && (signs[1] || state.hs[4] === null) && (signs[2] || state.hs[5] === null) ? "-" + ro : "vec3(" + (signs[0] ? '-' : '') + ro + ".x, " + (signs[1] ? '-' : '') + ro + ".y, " + (signs[2] ? '-' : '') + ro + ".z";
        cornerWithSigns = "vec3(" + (signs[0] ? -cornerSize[0] : cornerSize[0]) + ", " + (signs[1] ? -cornerSize[1] : cornerSize[1]) + ", " + (signs[2] ? -cornerSize[2] : cornerSize[2]) + ")";
        preludePush(flags.glslPrelude, "" + roWithSigns + " - " + cornerWithSigns);
        dist = preludePop(flags.glslPrelude);
        if (state.hs[0] !== null || state.hs[3] !== null) {
          state.codes.push("" + dist + ".x");
          if (state.hs[0] !== null) {
            state.hs[0] = null;
          } else {
            state.hs[3] = null;
          }
          remainingHalfSpaces -= 1;
        }
        if (state.hs[1] !== null || state.hs[4] !== null) {
          state.codes.push("" + dist + ".y");
          if (state.hs[1] !== null) {
            state.hs[1] = null;
          } else {
            state.hs[4] = null;
          }
          remainingHalfSpaces -= 1;
        }
        if (state.hs[2] !== null || state.hs[5] !== null) {
          state.codes.push("" + dist + ".z");
          if (state.hs[2] !== null) {
            state.hs[2] = null;
          } else {
            state.hs[5] = null;
          }
          remainingHalfSpaces -= 1;
        }
      }
    };
    postDispatch = {
      invert: function(stack, node, flags) {
        return flags.invert = !flags.invert;
      },
      union: function(stack, node, flags) {
        var c, codes, collectCode, cornersState, h, ro, _i, _j, _len, _len2, _ref;
        if (node.nodes.length === 0) {
          mecha.logInternalError("GLSL Compiler: Union node is empty.");
          return;
        }
        codes = [];
        collectCode = function(codes, nodes) {
          var node, _i, _len, _results;
          _results = [];
          for (_i = 0, _len = nodes.length; _i < _len; _i++) {
            node = nodes[_i];
            if (node.code != null) {
              codes.push(node.code);
            }
            _results.push((function() {
              switch (node.type) {
                case 'translate':
                case 'mirror':
                case 'invert':
                  return collectCode(codes, node.nodes);
              }
            })());
          }
          return _results;
        };
        collectCode(codes, node.nodes);
        ro = flags.glslPrelude[flags.glslPrelude.length - 1][0];
        cornersState = {
          codes: [],
          hs: node.halfSpaces.shallowClone()
        };
        compileCorner(ro, flags, cornersState);
        compileCorner(ro, flags, cornersState);
        codes = codes.concat(cornersState.codes);
        _ref = cornersState.hs;
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          h = _ref[_i];
          if (h !== null) {
            mecha.logInternalError("GLSL Compiler: Post-condition failed, some half spaces were not processed during corner compilation.");
            break;
          }
        }
        node.code = codes.shift();
        for (_j = 0, _len2 = codes.length; _j < _len2; _j++) {
          c = codes[_j];
          node.code = "min(" + c + ", " + node.code + ")";
        }
        return stack[0].nodes.push(node);
      },
      intersect: function(stack, node, flags) {
        var c, codes, collectCode, cornersState, h, ro, _i, _j, _len, _len2, _ref;
        if (node.nodes.length === 0) {
          mecha.logInternalError("GLSL Compiler: Intersect node is empty.");
          return;
        }
        codes = [];
        collectCode = function(codes, nodes) {
          var node, _i, _len, _results;
          _results = [];
          for (_i = 0, _len = nodes.length; _i < _len; _i++) {
            node = nodes[_i];
            if (node.code != null) {
              codes.push(node.code);
            }
            _results.push((function() {
              switch (node.type) {
                case 'translate':
                case 'mirror':
                case 'invert':
                  return collectCode(codes, node.nodes);
              }
            })());
          }
          return _results;
        };
        collectCode(codes, node.nodes);
        ro = flags.glslPrelude[flags.glslPrelude.length - 1][0];
        cornersState = {
          codes: [],
          hs: node.halfSpaces.shallowClone()
        };
        compileCorner(ro, flags, cornersState);
        compileCorner(ro, flags, cornersState);
        codes = codes.concat(cornersState.codes);
        _ref = cornersState.hs;
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          h = _ref[_i];
          if (h !== null) {
            mecha.logInternalError("GLSL Compiler: Post-condition failed, some half spaces were not processed during corner compilation.");
            break;
          }
        }
        node.code = codes.shift();
        for (_j = 0, _len2 = codes.length; _j < _len2; _j++) {
          c = codes[_j];
          node.code = "max(" + c + ", " + node.code + ")";
        }
        return stack[0].nodes.push(node);
      },
      translate: function(stack, node, flags) {
        preludePop(flags.glslPrelude);
        if (node.nodes.length === 0) {
          mecha.logInternalError("GLSL Compiler: Translate node is empty.");
          return;
        }
        return stack[0].nodes.push(node);
      },
      halfspace: function(stack, node, flags) {
        var index, ro, s, translateOffset, val, _i, _len;
        if (node.nodes.length !== 0) {
          mecha.logInternalError("GLSL Compiler: Halfspace node is not empty.");
          return;
        }
        translateOffset = 0.0;
        for (_i = 0, _len = stack.length; _i < _len; _i++) {
          s = stack[_i];
          switch (s.type) {
            case 'intersect':
              index = node.attr.axis + (flags.invert ? 3 : 0);
              val = node.attr.val + translateOffset;
              if (s.halfSpaces[index] === null || (index < 3 && val > s.halfSpaces[index]) || (index > 2 && val < s.halfSpaces[index])) {
                s.halfSpaces[index] = val;
              }
              break;
            case 'union':
              index = node.attr.axis + (flags.invert ? 3 : 0);
              val = node.attr.val + translateOffset;
              if (s.halfSpaces[index] === null || (index < 3 && val < s.halfSpaces[index]) || (index > 2 && val > s.halfSpaces[index])) {
                s.halfSpaces[index] = val;
              }
              break;
            case 'translate':
              translateOffset += s.attr.offset[node.attr.axis];
              continue;
            case 'invert':
            case 'mirror':
              continue;
            default:
              ro = flags.glslPrelude[flags.glslPrelude.length - 1][0];
              node.code = "" + node.attr.val + " - " + ro + "[" + node.attr.axis + "]";
          }
          break;
        }
        return stack[0].nodes.push(node);
      },
      cylinder: function(stack, node, flags) {
        var planeCoords, ro;
        ro = flags.glslPrelude[flags.glslPrelude.length - 1][0];
        planeCoords = ['yz', 'xz', 'xy'][node.attr.axis];
        node.code = "length(" + ro + "." + planeCoords + ") - " + node.attr.radius;
        return stack[0].nodes.push(node);
      },
      sphere: function(stack, node, flags) {
        var ro;
        ro = flags.glslPrelude[flags.glslPrelude.length - 1][0];
        node.code = "length(" + ro + ") - " + node.attr.radius;
        return stack[0].nodes.push(node);
      },
      "default": function(stack, node, flags) {
        return stack[0].nodes.push(node);
      }
    };
    console.log(abstractSolidModel);
    flags = {
      invert: false,
      glslFunctions: {},
      glslPrelude: [['ro', "" + rayOrigin]]
    };
    flags.glslPrelude.code = "";
    flags.glslPrelude.counter = 0;
    result = mapASM(preDispatch, postDispatch, [
      {
        nodes: []
      }
    ], abstractSolidModel, flags);
    console.log(result);
    if (result.nodes.length === 1) {
      result.nodes[0].code;
    } else {
      mecha.logInternalError('GLSL Compiler: Expected exactly one result node from compiler.');
      return "";
    }
    program = prefix + (glslLibrary.compile(flags.glslFunctions)) + (sceneDist(flags.glslPrelude.code, result.nodes[0].code)) + sceneNormal + main;
    console.log(program);
    return program;
  };
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
    api: {
      url: null,
      sourceCode: null
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
      return compileCSM(($('#source-code')).val(), function(result) {
        return (state.scene.findNode('main-shader')).set('shaders', [
          {
            stage: 'fragment',
            code: compileGLSL(compileASM(result))
          }
        ]);
      });
    } catch (error) {
      return mecha.log(error);
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
    return compileCSM(($('#source-code')).val(), function(result) {
      var shaderDef;
      shaderDef = {
        type: 'shader',
        id: 'main-shader',
        shaders: [
          {
            stage: 'fragment',
            code: compileGLSL(compileASM(result))
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
      mecha.log("Loaded " + state.api.url);
      return sceneInit();
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
}).call(this);
