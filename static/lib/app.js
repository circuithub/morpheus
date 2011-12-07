/*
 * Copyright 2011, CircuitHub.com
 */
"use strict";

(function() {
  var apiInit, asm, canvasInit, compileASM, compileASMBounds, compileCSM, compileGLSL, constants, controlsInit, controlsSourceCompile, glslCompiler, glslCompilerDistance, glslLibrary, glslSceneDistance, glslSceneId, keyDown, lookAtToQuaternion, mapASM, mecha, modifySubAttr, mouseCoordsWithinElement, mouseDown, mouseMove, mouseUp, mouseWheel, optimizeASM, orbitLookAt, orbitLookAtNode, recordToVec3, recordToVec4, registerControlEvents, registerDOMEvents, sceneIdle, sceneInit, state, toStringPrototype, vec3ToRecord, vec4ToRecord, windowResize, zoomLookAt, zoomLookAtNode;
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
        _results.push(Array.isArray(x) ? flatten(x) : [x]);
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

  toStringPrototype = (function() {

    function toStringPrototype(str) {
      this.str = str;
    }

    toStringPrototype.prototype.toString = function() {
      return this.str;
    };

    return toStringPrototype;

  })();

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
            if (n.type !== 'intersect') _results.push(n);
          }
          return _results;
        })()
      };
      for (_i = 0, _len = flattenedNodes.length; _i < _len; _i++) {
        n = flattenedNodes[_i];
        if (n.type === 'intersect') result.nodes = result.nodes.concat(n.nodes);
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
    rotate: function() {
      var attr, nodes;
      attr = arguments[0], nodes = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
      return {
        type: 'rotate',
        attr: attr,
        nodes: nodes.flatten()
      };
    },
    scale: function() {
      var attr, nodes;
      attr = arguments[0], nodes = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
      return {
        type: 'scale',
        attr: attr,
        nodes: nodes.flatten()
      };
    },
    material: function() {
      var attr, nodes;
      attr = arguments[0], nodes = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
      return {
        type: 'material',
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
    },
    chamfer: function() {
      var attr, nodes;
      attr = arguments[0], nodes = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
      return {
        type: 'chamfer',
        attr: attr,
        nodes: nodes.flatten()
      };
    },
    bevel: function() {
      var attr, nodes;
      attr = arguments[0], nodes = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
      return {
        type: 'bevel',
        attr: attr,
        nodes: nodes.flatten()
      };
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
            case 'intersect':
              break;
            default:
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
            case 'union':
              break;
            case 'intersect':
              stack[0].nodes = stack[0].nodes.concat(node.nodes);
              return;
            default:
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

  compileASMBounds = function(abstractSolidModel) {
    var COMPOSITION_INTERSECT, COMPOSITION_UNION, collectChildren, flags, intersectChildren, postDispatch, preDispatch, result, unionChildren;
    COMPOSITION_UNION = 0;
    COMPOSITION_INTERSECT = 1;
    preDispatch = {
      invert: function(stack, node, flags) {
        return flags.invert = !flags.invert;
      },
      union: function(stack, node, flags) {
        return flags.composition.push(COMPOSITION_UNION);
      },
      intersect: function(stack, node, flags) {
        return flags.composition.push(COMPOSITION_INTERSECT);
      },
      "default": function(stack, node, flags) {}
    };
    unionChildren = function(nodes) {
      var bounds, i, n, _i, _len;
      bounds = [[Infinity, Infinity, Infinity], [-Infinity, -Infinity, -Infinity]];
      for (_i = 0, _len = nodes.length; _i < _len; _i++) {
        n = nodes[_i];
        for (i = 0; i <= 2; i++) {
          bounds[0][i] = Math.min(n.bounds[0][i], bounds[0][i]);
        }
        for (i = 0; i <= 2; i++) {
          bounds[1][i] = Math.max(n.bounds[1][i], bounds[1][i]);
        }
      }
      return bounds;
    };
    intersectChildren = function(nodes) {
      var bounds, i, n, _i, _len;
      bounds = [[-Infinity, -Infinity, -Infinity], [Infinity, Infinity, Infinity]];
      for (_i = 0, _len = nodes.length; _i < _len; _i++) {
        n = nodes[_i];
        for (i = 0; i <= 2; i++) {
          bounds[0][i] = Math.max(n.bounds[0][i], bounds[0][i]);
        }
        for (i = 0; i <= 2; i++) {
          bounds[1][i] = Math.min(n.bounds[1][i], bounds[1][i]);
        }
      }
      return bounds;
    };
    collectChildren = function(nodes, flags) {
      var composition;
      composition = flags.composition[flags.composition.length - 1];
      if (composition === COMPOSITION_UNION) {
        return unionChildren(nodes);
      } else {
        return intersectChildren(nodes);
      }
    };
    postDispatch = {
      invert: function(stack, node, flags) {
        node.bounds = collectChildren(node.nodes, flags);
        flags.invert = !flags.invert;
        return stack[0].nodes.push(node);
      },
      union: function(stack, node, flags) {
        node.bounds = collectChildren(node.nodes, flags);
        flags.composition.pop();
        return stack[0].nodes.push(node);
      },
      intersect: function(stack, node, flags) {
        node.bounds = collectChildren(node.nodes, flags);
        flags.composition.pop();
        return stack[0].nodes.push(node);
      },
      translate: function(stack, node, flags) {
        var i;
        node.bounds = collectChildren(node.nodes, flags);
        for (i = 0; i <= 2; i++) {
          node.bounds[0][i] += node.attr.offset[i];
        }
        for (i = 0; i <= 2; i++) {
          node.bounds[1][i] += node.attr.offset[i];
        }
        return stack[0].nodes.push(node);
      },
      halfspace: function(stack, node, flags) {
        node.bounds = [[-Infinity, -Infinity, -Infinity], [Infinity, Infinity, Infinity]];
        node.bounds[flags.invert ? 0 : 1][node.attr.axis] = node.attr.val;
        return stack[0].nodes.push(node);
      },
      cylinder: function(stack, node, flags) {
        node.bounds = [[-node.attr.radius, -node.attr.radius, -node.attr.radius], [node.attr.radius, node.attr.radius, node.attr.radius]];
        node.bounds[0][node.attr.axis] = -Infinity;
        node.bounds[1][node.attr.axis] = Infinity;
        return stack[0].nodes.push(node);
      },
      sphere: function(stack, node, flags) {
        node.bounds = [[-node.attr.radius, -node.attr.radius, -node.attr.radius], [node.attr.radius, node.attr.radius, node.attr.radius]];
        return stack[0].nodes.push(node);
      },
      "default": function(stack, node, flags) {
        node.bounds = collectChildren(node.nodes, flags);
        return stack[0].nodes.push(node);
      }
    };
    flags = {
      invert: false,
      composition: [COMPOSITION_UNION]
    };
    result = mapASM(preDispatch, postDispatch, [
      {
        nodes: []
      }
    ], abstractSolidModel, flags);
    result.flags = flags;
    return result;
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
            _ref = node.nodes.slice(1, node.nodes.length + 1 || 9e9);
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
      },
      rotate: function(node) {
        var n;
        return asm.rotate.apply(asm, [node.attr].concat(__slice.call((function() {
          var _i, _len, _ref, _results;
          _ref = node.nodes;
          _results = [];
          for (_i = 0, _len = _ref.length; _i < _len; _i++) {
            n = _ref[_i];
            _results.push(compileASMNode(n));
          }
          return _results;
        })())));
      },
      scale: function(node) {
        var n;
        return asm.scale.apply(asm, [node.attr].concat(__slice.call((function() {
          var _i, _len, _ref, _results;
          _ref = node.nodes;
          _results = [];
          for (_i = 0, _len = _ref.length; _i < _len; _i++) {
            n = _ref[_i];
            _results.push(compileASMNode(n));
          }
          return _results;
        })())));
      },
      material: function(node) {
        var n;
        return asm.material.apply(asm, [node.attr].concat(__slice.call((function() {
          var _i, _len, _ref, _results;
          _ref = node.nodes;
          _results = [];
          for (_i = 0, _len = _ref.length; _i < _len; _i++) {
            n = _ref[_i];
            _results.push(compileASMNode(n));
          }
          return _results;
        })())));
      },
      chamfer: function(node) {
        var n;
        return asm.chamfer.apply(asm, [node.attr].concat(__slice.call((function() {
          var _i, _len, _ref, _results;
          _ref = node.nodes;
          _results = [];
          for (_i = 0, _len = _ref.length; _i < _len; _i++) {
            n = _ref[_i];
            _results.push(compileASMNode(n));
          }
          return _results;
        })())));
      },
      bevel: function(node) {
        var n;
        return asm.bevel.apply(asm, [node.attr].concat(__slice.call((function() {
          var _i, _len, _ref, _results;
          _ref = node.nodes;
          _results = [];
          for (_i = 0, _len = _ref.length; _i < _len; _i++) {
            n = _ref[_i];
            _results.push(compileASMNode(n));
          }
          return _results;
        })())));
      },
      wedge: function(node) {
        var n;
        return asm.intersect.apply(asm, [asm.halfspace({
          val: 0.0,
          axis: node.attr.axis
        }), asm.invert(asm.halfspace({
          val: 0.0,
          axis: node.attr.axis
        }))].concat(__slice.call((function() {
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
    result = mapASM(preDispatch, postDispatch, [
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
    prelude.push([name, value]);
    prelude.counter += 1;
    prelude.code += "  " + (valueType != null ? valueType : 'vec3') + " " + name + " = " + value + ";\n";
    return name;
  };

  glslCompiler.preludePop = function(prelude) {
    return prelude.pop()[0];
  };

  glslCompilerDistance = function(primitiveCallback, minCallback, maxCallback) {
    var compileCompositeNode, compileCorner, postDispatch, preDispatch, rayOrigin;
    rayOrigin = 'ro';
    preDispatch = {
      invert: function(stack, node, flags) {
        return flags.invert = !flags.invert;
      },
      union: function(stack, node, flags) {
        var i, _results;
        flags.composition.push(glslCompiler.COMPOSITION_UNION);
        node.halfSpaces = [];
        _results = [];
        for (i = 0; i <= 5; i++) {
          _results.push(node.halfSpaces.push(null));
        }
        return _results;
      },
      intersect: function(stack, node, flags) {
        var i, _results;
        flags.composition.push(glslCompiler.COMPOSITION_INTERSECT);
        node.halfSpaces = [];
        _results = [];
        for (i = 0; i <= 5; i++) {
          _results.push(node.halfSpaces.push(null));
        }
        return _results;
      },
      chamfer: function(stack, node, flags) {
        var i, _results;
        node.halfSpaces = [];
        _results = [];
        for (i = 0; i <= 5; i++) {
          _results.push(node.halfSpaces.push(null));
        }
        return _results;
      },
      bevel: function(stack, node, flags) {
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
        return glslCompiler.preludePush(flags.glslPrelude, "" + ro + " - vec3(" + node.attr.offset[0] + ", " + node.attr.offset[1] + ", " + node.attr.offset[2] + ")");
      },
      material: function(stack, node, flags) {
        flags.materialIdStack.push(flags.materials.length);
        return flags.materials.push("vec3(" + node.attr.color[0] + ", " + node.attr.color[1] + ", " + node.attr.color[2] + ")");
      },
      "default": function(stack, node, flags) {}
    };
    compileCorner = function(ro, flags, state, radius) {
      var cornerSize, cornerSpaces, cornerWithSigns, dist, h, index, remainingHalfSpaces, roWithSigns, signs, _i, _len, _ref;
      remainingHalfSpaces = 0;
      _ref = state.hs;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        h = _ref[_i];
        if (h !== null) remainingHalfSpaces += 1;
      }
      if (remainingHalfSpaces === 1) {
        for (index = 0; index <= 5; index++) {
          if (!(state.hs[index] !== null)) continue;
          state.codes.push(primitiveCallback((index > 2 ? "" + ro + "[" + (index - 3) + "] - " + state.hs[index] : "-" + ro + "[" + index + "] + " + state.hs[index]), flags));
          state.hs[index] = null;
          break;
        }
        remainingHalfSpaces -= 1;
      } else if (remainingHalfSpaces > 1) {
        cornerSpaces = 0;
        if (state.hs[0] !== null || state.hs[3] !== null) cornerSpaces += 1;
        if (state.hs[1] !== null || state.hs[4] !== null) cornerSpaces += 1;
        if (state.hs[2] !== null || state.hs[5] !== null) cornerSpaces += 1;
        if (cornerSpaces === 1) radius = 0;
        cornerSize = [state.hs[0] !== null ? -state.hs[0] + radius : state.hs[3] !== null ? state.hs[3] - radius : 0, state.hs[1] !== null ? -state.hs[1] + radius : state.hs[4] !== null ? state.hs[4] - radius : 0, state.hs[2] !== null ? -state.hs[2] + radius : state.hs[5] !== null ? state.hs[5] - radius : 0];
        signs = [state.hs[0] !== null, state.hs[1] !== null, state.hs[2] !== null];
        roWithSigns = !(signs[0] || signs[1] || signs[2]) ? "" + ro : (signs[0] || state.hs[3] === null) && (signs[1] || state.hs[4] === null) && (signs[2] || state.hs[5] === null) ? "-" + ro : "vec3(" + (signs[0] ? '-' : '') + ro + ".x, " + (signs[1] ? '-' : '') + ro + ".y, " + (signs[2] ? '-' : '') + ro + ".z";
        cornerWithSigns = "vec3(" + cornerSize[0] + ", " + cornerSize[1] + ", " + cornerSize[2] + ")";
        glslCompiler.preludePush(flags.glslPrelude, "" + roWithSigns + " - " + cornerWithSigns);
        dist = glslCompiler.preludePop(flags.glslPrelude);
        if (cornerSpaces > 1) {
          if (radius > 0) {
            state.codes.push(primitiveCallback("length(max(" + dist + ", 0.0)) - " + radius, flags));
          } else {
            state.codes.push(primitiveCallback("length(max(" + dist + ", 0.0))", flags));
          }
          if (state.hs[0] !== null || state.hs[3] !== null) {
            if (state.hs[0] !== null) {
              state.hs[0] = null;
            } else {
              state.hs[3] = null;
            }
          }
          if (state.hs[1] !== null || state.hs[4] !== null) {
            if (state.hs[1] !== null) {
              state.hs[1] = null;
            } else {
              state.hs[4] = null;
            }
          }
          if (state.hs[2] !== null || state.hs[5] !== null) {
            if (state.hs[2] !== null) {
              state.hs[2] = null;
            } else {
              state.hs[5] = null;
            }
          }
          remainingHalfSpaces -= cornerSpaces;
        } else {
          if (state.hs[0] !== null || state.hs[3] !== null) {
            state.codes.push(primitiveCallback("" + dist + ".x", flags));
            if (state.hs[0] !== null) {
              state.hs[0] = null;
            } else {
              state.hs[3] = null;
            }
          } else if (state.hs[1] !== null || state.hs[4] !== null) {
            state.codes.push(primitiveCallback("" + dist + ".y", flags));
            if (state.hs[1] !== null) {
              state.hs[1] = null;
            } else {
              state.hs[4] = null;
            }
          } else if (state.hs[2] !== null || state.hs[5] !== null) {
            state.codes.push(primitiveCallback("" + dist + ".z", flags));
            if (state.hs[2] !== null) {
              state.hs[2] = null;
            } else {
              state.hs[5] = null;
            }
          }
          remainingHalfSpaces -= 1;
        }
      }
    };
    compileCompositeNode = function(name, cmpCallback, stack, node, flags) {
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
          if (node.code != null) codes.push(node.code);
          switch (node.type) {
            case 'translate':
            case 'mirror':
            case 'invert':
            case 'material':
              _results.push(collectCode(codes, node.nodes));
              break;
            default:
              _results.push(void 0);
          }
        }
        return _results;
      };
      collectCode(codes, node.nodes);
      ro = flags.glslPrelude[flags.glslPrelude.length - 1][0];
      cornersState = {
        codes: [],
        hs: node.halfSpaces.shallowClone()
      };
      compileCorner(ro, flags, cornersState, (node.type === 'chamfer' ? node.attr.radius : 0));
      compileCorner(ro, flags, cornersState, (node.type === 'chamfer' ? node.attr.radius : 0));
      codes = codes.concat(cornersState.codes);
      _ref = cornersState.hs;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        h = _ref[_i];
        if (!(h !== null)) continue;
        mecha.logInternalError("GLSL Compiler: Post-condition failed, some half spaces were not processed during corner compilation.");
        break;
      }
      node.code = codes.shift();
      for (_j = 0, _len2 = codes.length; _j < _len2; _j++) {
        c = codes[_j];
        node.code = cmpCallback(c, node.code, flags);
      }
      return stack[0].nodes.push(node);
    };
    postDispatch = {
      invert: function(stack, node, flags) {
        return flags.invert = !flags.invert;
      },
      union: function(stack, node, flags) {
        flags.composition.pop();
        return compileCompositeNode('Union', minCallback, stack, node, flags);
      },
      intersect: function(stack, node, flags) {
        flags.composition.pop();
        return compileCompositeNode('Intersect', maxCallback, stack, node, flags);
      },
      chamfer: function(stack, node, flags) {
        var cmpCallback;
        cmpCallback = flags.composition[flags.composition.length - 1] === glslCompiler.COMPOSITION_UNION ? minCallback : maxCallback;
        return compileCompositeNode('Chamfer', cmpCallback, stack, node, flags);
      },
      bevel: function(stack, node, flags) {
        var cmpCallback;
        cmpCallback = flags.composition[flags.composition.length - 1] === glslCompiler.COMPOSITION_UNION ? minCallback : maxCallback;
        return compileCompositeNode('Bevel', cmpCallback, stack, node, flags);
      },
      translate: function(stack, node, flags) {
        glslCompiler.preludePop(flags.glslPrelude);
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
              node.code = primitiveCallback("" + node.attr.val + " - " + ro + "[" + node.attr.axis + "]", flags);
          }
          break;
        }
        return stack[0].nodes.push(node);
      },
      cylinder: function(stack, node, flags) {
        var planeCoords, ro;
        ro = flags.glslPrelude[flags.glslPrelude.length - 1][0];
        planeCoords = ['yz', 'xz', 'xy'][node.attr.axis];
        node.code = primitiveCallback("length(" + ro + "." + planeCoords + ") - " + node.attr.radius, flags);
        return stack[0].nodes.push(node);
      },
      sphere: function(stack, node, flags) {
        var ro;
        ro = flags.glslPrelude[flags.glslPrelude.length - 1][0];
        node.code = primitiveCallback("length(" + ro + ") - " + node.attr.radius, flags);
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
  }));

  glslSceneId = glslCompilerDistance((function(a, flags) {
    var result;
    result = new toStringPrototype(a);
    result.materialId = flags.materialIdStack[flags.materialIdStack.length - 1];
    return result;
  }), (function(a, b, flags) {
    var memoA, memoB, result;
    glslCompiler.preludePush(flags.glslPrelude, String(a), 'float');
    memoA = glslCompiler.preludePop(flags.glslPrelude);
    glslCompiler.preludePush(flags.glslPrelude, String(b), 'float');
    memoB = glslCompiler.preludePop(flags.glslPrelude);
    result = new toStringPrototype("" + memoA + " < " + memoB + "? (id = " + a.materialId + ", " + memoA + ") : (id = " + b.materialId + ", " + memoB + ")");
    result.materialId = flags.materialIdStack[flags.materialIdStack.length - 1];
    return result;
  }), (function(a, b, flags) {
    var memoA, memoB, result;
    glslCompiler.preludePush(flags.glslPrelude, String(a), 'float');
    memoA = glslCompiler.preludePop(flags.glslPrelude);
    glslCompiler.preludePush(flags.glslPrelude, String(b), 'float');
    memoB = glslCompiler.preludePop(flags.glslPrelude);
    result = new toStringPrototype("" + memoA + " > " + memoB + "? (id = " + a.materialId + ", " + memoA + ") : (id = " + b.materialId + ", " + memoB + ")");
    result.materialId = flags.materialIdStack[flags.materialIdStack.length - 1];
    return result;
  }));

  compileGLSL = function(abstractSolidModel) {
    var boundsResult, distanceResult, fragmentShader, fragmentShaderMain, idResult, prefix, rayDirection, rayOrigin, sceneDist, sceneId, sceneMaterial, sceneNormal, sceneRayDist, uniforms, vertexShader, vertexShaderMain;
    rayOrigin = 'ro';
    rayDirection = 'rd';
    prefix = '#ifdef GL_ES\n  precision highp float;\n#endif\nuniform vec3 SCENEJS_uEye;                  // World-space eye position\nvarying vec3 SCENEJS_vEyeVec;               // Output world-space eye vector\nvarying vec4 SCENEJS_vWorldVertex;          // Varying for fragment clip or world pos hook\n';
    uniforms = "";
    sceneDist = function(prelude, code) {
      return "\nfloat sceneDist(in vec3 " + rayOrigin + "){\n" + prelude + "  return max(0.0," + code + ");\n}\n\n";
    };
    sceneRayDist = 'float sceneRayDist(in vec3 ro, in vec3 rd) {\n  return 0.0;\n}\n';
    sceneNormal = 'vec3 sceneNormal(in vec3 p) {\n  const float eps = 0.0001;\n  vec3 n;\n  n.x = sceneDist( vec3(p.x+eps, p.yz) ) - sceneDist( vec3(p.x-eps, p.yz) );\n  n.y = sceneDist( vec3(p.x, p.y+eps, p.z) ) - sceneDist( vec3(p.x, p.y-eps, p.z) );\n  n.z = sceneDist( vec3(p.xy, p.z+eps) ) - sceneDist( vec3(p.xy, p.z-eps) );\n  return normalize(n);\n}\n';
    sceneId = function(prelude, code) {
      return "\nint sceneId(in vec3 " + rayOrigin + ") {\n  int id = -1;\n" + prelude + "  " + code + ";\n  return id;\n}\n\n";
    };
    sceneMaterial = function(materials) {
      var binarySearch, i, m, result, _ref;
      binarySearch = function(start, end) {
        var diff, mid;
        diff = end - start;
        if (diff === 1) {
          return "m" + start;
        } else {
          mid = Math.floor(diff * 0.5);
          return "(id < " + mid + "? " + (binarySearch(start, mid)) + " : " + (binarySearch(mid, end)) + ")";
        }
      };
      result = "\nvec3 sceneMaterial(in vec3 ro) {\n  int id = sceneId(ro);\n";
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
    fragmentShaderMain = 'void main(void) {\n  const int steps = 64;\n  const float threshold = 0.01;\n  vec3 rayDir = /*normalize*/(/*SCENEJS_uMMatrix * */ -SCENEJS_vEyeVec);\n  vec3 rayOrigin = SCENEJS_vWorldVertex.xyz;\n  bool hit = false;\n  float dist = 0.0;\n  for(int i = 0; i < steps; i++) {\n    //dist = sceneRayDist(rayOrigin, rayDir);\n    dist = sceneDist(rayOrigin);\n    if (dist < threshold) {\n      hit = true;\n      break;\n    }\n    rayOrigin += dist * rayDir;\n  }\n  if(!hit) { discard; }\n  //if(!hit) { gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0); return; }\n  //const vec3 diffuseColor = vec3(0.1, 0.2, 0.8);\n  vec3 diffuseColor = sceneMaterial(rayOrigin);\n  //const vec3 specularColor = vec3(1.0, 1.0, 1.0);\n  const vec3 lightPos = vec3(1.5,1.5, 4.0);\n  vec3 ldir = normalize(lightPos - rayOrigin);\n  vec3 diffuse = diffuseColor * dot(sceneNormal(rayOrigin), ldir);\n  gl_FragColor = vec4(diffuse, 1.0);\n}\n';
    vertexShaderMain = function(bounds) {
      return ("const vec3 sceneScale = vec3(" + (bounds[1][0] - bounds[0][0]) + ", " + (bounds[1][1] - bounds[0][1]) + ", " + (bounds[1][2] - bounds[0][2]) + ");\n") + ("const vec3 sceneTranslation = vec3(" + (bounds[0][0] + bounds[1][0]) + ", " + (bounds[0][1] + bounds[1][1]) + ", " + (bounds[0][2] + bounds[1][2]) + ");\n") + 'uniform mat4 projection;\nuniform mat4 modelView;\nattribute vec3 position;\n\nvoid main(void) {\n  gl_Position = projection * modelView * vec4(position, 1.0);\n}\n';
    };
    console.log("ASM:");
    console.log(abstractSolidModel);
    distanceResult = glslSceneDistance(abstractSolidModel);
    if (distanceResult.nodes.length !== 1) {
      mecha.logInternalError('GLSL Compiler: Expected exactly one result node from the distance compiler.');
    }
    console.log("Distance Result:");
    console.log(distanceResult);
    idResult = glslSceneId(abstractSolidModel);
    if (idResult.nodes.length !== 1) {
      mecha.logInternalError('GLSL Compiler: Expected exactly one result node from the material id compiler.');
    }
    console.log("Id Result:");
    console.log(idResult);
    fragmentShader = prefix + (glslLibrary.compile(distanceResult.flags.glslFunctions)) + (sceneDist(distanceResult.flags.glslPrelude.code, distanceResult.nodes[0].code)) + sceneNormal + (sceneId(idResult.flags.glslPrelude.code, idResult.nodes[0].code)) + (sceneMaterial(idResult.flags.materials)) + fragmentShaderMain;
    console.log(fragmentShader);
    boundsResult = compileASMBounds(abstractSolidModel);
    if (boundsResult.nodes.length !== 1) {
      mecha.logInternalError('GLSL Compiler: Expected exactly one result node from the bounding box compiler.');
    }
    console.log("Bounds Result:");
    console.log(boundsResult);
    vertexShader = vertexShaderMain(boundsResult.nodes[0].bounds);
    console.log(vertexShader);
    return [vertexShader, fragmentShader];
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

}).call(this);
