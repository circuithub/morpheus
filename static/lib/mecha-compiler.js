/*
 * Copyright 2011, CircuitHub.com
 */
var mecha = mecha || {}; /* Redeclaring mecha is fine: behaves like a no-op (https://developer.mozilla.org/en/JavaScript/Reference/Scope_Cheatsheet) */

mecha.compiler = 
(function() {
  "use strict";
  var asm, compileASM, compileASMBounds, exports, flatten, mapASM, math_degToRad, math_invsqrt2, math_radToDeg, math_sqrt2, optimizeASM, safeExport, safeTry, shallowClone, translateCSM,
    __slice = Array.prototype.slice;

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

  translateCSM = safeExport('mecha.compiler.translateCSM', '', function(apiSourceCode, csmSourceCode) {
    var jsSourceCode, variablesSource;
    variablesSource = csmSourceCode.match(/var[^;]*;/g);
    csmSourceCode = (csmSourceCode.replace(/var[^;]*;/g, '')).trim();
    jsSourceCode = "\"use strict\";\n(function(){\n  /* BEGIN API */\n  \n  var exportedParameters = [];\n\n" + apiSourceCode + "\n\n  try {\n\n  /* BEGIN PARAMETERS */\n\n" + (variablesSource ? variablesSource.join('\n') : "") + "\n\n  /* BEGIN SOURCE */ //HERE\n  return scene({ params: exportedParameters }" + (csmSourceCode.trim().length > 0 ? ',' : '') + "\n\n" + csmSourceCode + "\n\n  );//*/\n  } catch(err) {\n    return String(err);\n  }\n})();";
    return jsSourceCode;
  });

  asm = {
    union: function() {
      var nodes;
      nodes = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
      return {
        type: 'union',
        nodes: flatten(nodes)
      };
    },
    intersect: function() {
      var flattenedNodes, n, nodes, result, _i, _len;
      nodes = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
      flattenedNodes = flatten(nodes);
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
        nodes: flatten(nodes)
      };
    },
    mirror: function() {
      var attr, nodes;
      attr = arguments[0], nodes = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
      return {
        type: 'mirror',
        attr: attr,
        nodes: flatten(nodes)
      };
    },
    repeat: function() {
      var attr, nodes;
      attr = arguments[0], nodes = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
      return {
        type: 'repeat',
        attr: attr,
        nodes: flatten(nodes)
      };
    },
    translate: function() {
      var attr, nodes;
      attr = arguments[0], nodes = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
      return {
        type: 'translate',
        attr: attr,
        nodes: flatten(nodes)
      };
    },
    rotate: function() {
      var attr, nodes;
      attr = arguments[0], nodes = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
      return {
        type: 'rotate',
        attr: attr,
        nodes: flatten(nodes)
      };
    },
    scale: function() {
      var attr, nodes;
      attr = arguments[0], nodes = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
      return {
        type: 'scale',
        attr: attr,
        nodes: flatten(nodes)
      };
    },
    material: function() {
      var attr, nodes;
      attr = arguments[0], nodes = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
      return {
        type: 'material',
        attr: attr,
        nodes: flatten(nodes)
      };
    },
    halfspace: function(attr) {
      return {
        type: 'halfspace',
        attr: attr
      };
    },
    corner: function(attr) {
      return {
        type: 'corner',
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
        nodes: flatten(nodes)
      };
    },
    bevel: function() {
      var attr, nodes;
      attr = arguments[0], nodes = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
      return {
        type: 'bevel',
        attr: attr,
        nodes: flatten(nodes)
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
                  if ((n.attr.val > node.attr.val && flags.invert) || (n.attr.val < node.attr.val && !flags.invert)) {
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
    if (!(abstractSolidModel != null)) return null;
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
          if (typeof node.attr.offset[i] === 'number') {
            node.bounds[0][i] += node.attr.offset[i];
          }
        }
        for (i = 0; i <= 2; i++) {
          if (typeof node.attr.offset[i] === 'number') {
            node.bounds[1][i] += node.attr.offset[i];
          }
        }
        return stack[0].nodes.push(node);
      },
      rotate: function(stack, node, flags) {
        node.bounds = collectChildren(node.nodes, flags);
        return stack[0].nodes.push(node);
      },
      scale: function(stack, node, flags) {
        node.bounds = collectChildren(node.nodes, flags);
        return stack[0].nodes.push(node);
      },
      halfspace: function(stack, node, flags) {
        node.bounds = [[-Infinity, -Infinity, -Infinity], [Infinity, Infinity, Infinity]];
        if (typeof node.attr.val === 'string') {} else {
          node.bounds[flags.invert ? 1 : 0][node.attr.axis] = node.attr.val;
        }
        return stack[0].nodes.push(node);
      },
      cylinder: function(stack, node, flags) {
        if (typeof node.attr.radius === 'number') {
          node.bounds = [[-node.attr.radius, -node.attr.radius, -node.attr.radius], [node.attr.radius, node.attr.radius, node.attr.radius]];
          node.bounds[0][node.attr.axis] = -Infinity;
          node.bounds[1][node.attr.axis] = Infinity;
        } else {
          node.bounds = [[-Infinity, -Infinity, -Infinity], [Infinity, Infinity, Infinity]];
        }
        return stack[0].nodes.push(node);
      },
      sphere: function(stack, node, flags) {
        if (typeof node.attr.radius === 'number') {
          node.bounds = [[-node.attr.radius, -node.attr.radius, -node.attr.radius], [node.attr.radius, node.attr.radius, node.attr.radius]];
        } else {
          node.bounds = [[-Infinity, -Infinity, -Infinity], [Infinity, Infinity, Infinity]];
        }
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

  compileASM = safeExport('mecha.compiler.compileASM', null, function(concreteSolidModel) {
    var compileASMNode, dispatch;
    if (!(concreteSolidModel != null)) return null;
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
        /*
              if Array.isArray node.attr.dimensions
                halfspaces = for i in [0..2]
                  asm.halfspace 
                    val: glsl.mul (glsl.index node.attr.dimensions, i), 0.5
                    axis: i
                asm.mirror { axes: [0,1,2] }, asm.intersect halfspaces[0], halfspaces[1], halfspaces[2]
        */        return asm.mirror({
          axes: [0, 1, 2]
        }, asm.corner({
          val: glsl.mul(node.attr.dimensions, 0.5)
        }));
      },
      sphere: function(node) {
        return asm.sphere({
          radius: node.attr.radius
        });
      },
      cylinder: function(node) {
        var halfspaces;
        if (node.attr.length != null) {
          halfspaces = [
            asm.halfspace({
              val: node.attr.length * 0.5,
              axis: node.attr.axis
            }), asm.invert(asm.halfspace({
              val: node.attr.length * -0.5,
              axis: node.attr.axis
            }))
          ];
          return asm.intersect(asm.cylinder({
            radius: node.attr.radius,
            axis: node.attr.axis
          }), halfspaces[0], halfspaces[1]);
        } else {
          return asm.cylinder({
            radius: node.attr.radius,
            axis: node.attr.axis
          });
        }
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
          return asm.intersect(compileASMNode(node.nodes[0]), asm.invert.apply(asm, (function() {
            var _i, _len, _ref, _results;
            _ref = node.nodes.slice(1, node.nodes.length);
            _results = [];
            for (_i = 0, _len = _ref.length; _i < _len; _i++) {
              n = _ref[_i];
              _results.push(compileASMNode(n));
            }
            return _results;
          })()));
        } else {
          return node;
        }
      },
      mirror: function(node) {
        var n;
        return asm.mirror.apply(asm, [node.attr].concat(__slice.call((function() {
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
      repeat: function(node) {
        var n;
        return asm.repeat.apply(asm, [node.attr].concat(__slice.call((function() {
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
        var halfSpaceAxis, n;
        halfSpaceAxis = node.attr.axis + 1 > 2 ? 0 : node.attr.axis + 1;
        return asm.intersect.apply(asm, [asm.rotate({
          axis: node.attr.axis,
          angle: node.attr.from
        }, asm.halfspace({
          val: 0.0,
          axis: halfSpaceAxis
        })), asm.rotate({
          axis: node.attr.axis,
          angle: node.attr.to
        }, asm.invert(asm.halfspace({
          val: 0.0,
          axis: halfSpaceAxis
        })))].concat(__slice.call((function() {
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
      bend: function(node) {
        var direction, n, offset, offsetVec, radiusVec, upAxis;
        offset = node.attr.offset != null ? node.attr.offset : 0;
        (offsetVec = [0.0, 0.0, 0.0])[node.attr.offsetAxis] = offset;
        direction = node.attr.direction != null ? node.attr.direction : 1;
        if (!(node.attr.radius != null) || node.attr.radius === 0) {
          return asm.union(asm.intersect.apply(asm, __slice.call((function() {
            var _i, _len, _ref, _results;
            _ref = node.nodes;
            _results = [];
            for (_i = 0, _len = _ref.length; _i < _len; _i++) {
              n = _ref[_i];
              _results.push(compileASMNode(n));
            }
            return _results;
          })()).concat([direction === 1 ? asm.translate({
            offset: offsetVec
          }, asm.rotate({
            axis: node.attr.axis,
            angle: glsl.mul(0.5, node.attr.angle)
          }, asm.halfspace({
            val: 0.0,
            axis: node.attr.offsetAxis
          }))) : asm.invert(asm.translate({
            offset: offsetVec
          }, asm.rotate({
            axis: node.attr.axis,
            angle: node.attr.angle
          }, asm.halfspace({
            val: 0.0,
            axis: node.attr.axis
          }))))])), asm.intersect(asm.translate({
            offset: offsetVec
          }, asm.rotate.apply(asm, [{
            axis: node.attr.axis,
            angle: node.attr.angle
          }].concat(__slice.call((function() {
            var _i, _len, _ref, _results;
            _ref = node.nodes;
            _results = [];
            for (_i = 0, _len = _ref.length; _i < _len; _i++) {
              n = _ref[_i];
              _results.push(compileASMNode(n));
            }
            return _results;
          })())))), asm.invert(asm.translate({
            offset: offsetVec
          }, asm.rotate({
            axis: node.attr.axis,
            angle: glsl.mul(0.5, node.attr.angle)
          }, asm.halfspace({
            val: 0.0,
            axis: node.attr.offsetAxis
          }))))));
        } else {
          upAxis = (function() {
            switch (node.attr.offsetAxis) {
              case 0:
                if (node.attr.axis === 2) {
                  return 1;
                } else {
                  return 2;
                }
              case 1:
                if (node.attr.axis === 2) {
                  return 0;
                } else {
                  return 2;
                }
              case 2:
                if (node.attr.axis === 1) {
                  return 0;
                } else {
                  return 1;
                }
            }
          })();
          (radiusVec = [0.0, 0.0, 0.0])[upAxis] = -node.attr.radius;
          return asm.union(asm.intersect.apply(asm, __slice.call((function() {
            var _i, _len, _ref, _results;
            _ref = node.nodes;
            _results = [];
            for (_i = 0, _len = _ref.length; _i < _len; _i++) {
              n = _ref[_i];
              _results.push(compileASMNode(n));
            }
            return _results;
          })()).concat([direction === 1 ? asm.halfspace({
            val: offset,
            axis: node.attr.offsetAxis
          }) : asm.invert(asm.translate({
            offset: offsetVec
          }, asm.rotate({
            axis: node.attr.axis,
            angle: node.attr.angle
          }, asm.halfspace({
            val: 0.0,
            axis: node.attr.axis
          }))))])), asm.intersect(asm.translate({
            offset: glsl.sub(offsetVec, radiusVec)
          }, asm.rotate({
            axis: node.attr.axis,
            angle: node.attr.angle
          }, asm.translate.apply(asm, [{
            offset: radiusVec
          }].concat(__slice.call((function() {
            var _i, _len, _ref, _results;
            _ref = node.nodes;
            _results = [];
            for (_i = 0, _len = _ref.length; _i < _len; _i++) {
              n = _ref[_i];
              _results.push(compileASMNode(n));
            }
            return _results;
          })()))))), asm.invert(asm.translate({
            offset: offsetVec
          }, asm.rotate({
            axis: node.attr.axis,
            angle: node.attr.angle
          }, asm.halfspace({
            val: 0.0,
            axis: node.attr.offsetAxis
          }))))));
        }
      }
    };
    compileASMNode = function(node) {
      switch (typeof node) {
        case 'object':
          if (dispatch[node.type] != null) {
            return dispatch[node.type](node);
          } else {
            mecha.logInternalError("Unexpected node type '" + node.type + "'.");
            return {};
          }
          break;
        default:
          mecha.logInternalError("Unexpected node of type '" + (typeof node) + "'.");
          return {};
      }
    };
    if (concreteSolidModel.type !== 'scene') {
      mecha.logInternalError("Expected node of type 'scene' at the root of the solid model, instead, got '" + concreteSolidModel.type + "'.");
      return null;
    }
    return optimizeASM(compileASMNode(concreteSolidModel));
  });

  exports = exports != null ? exports : {};

  exports.translateCSM = translateCSM;

  exports.compileASM = compileASM;

  exports.mapASM = mapASM;

  return exports;

}).call(this);
