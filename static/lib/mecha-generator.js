/*
 * Copyright 2011, CircuitHub.com
 */
var mecha = mecha || {}; /* Redeclaring mecha is fine: behaves like a no-op (https://developer.mozilla.org/en/JavaScript/Reference/Scope_Cheatsheet) */

mecha.generator = 
(function() {

  "use strict";

  var asm, compileASM, compileASMBounds, compileGLSL, exports, flatten, gl, glsl, glslCompiler, glslCompilerDistance, glslLibrary, glslSceneDistance, glslSceneId, mapASM, math_degToRad, math_invsqrt2, math_radToDeg, math_sqrt2, optimizeASM, shallowClone, toStringPrototype, translateCSM;
  var __slice = Array.prototype.slice;

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

  mecha.logInternalError = ((typeof console !== "undefined" && console !== null) && (console.error != null) ? function() {
    return console.error.apply(console, arguments);
  } : function() {});

  mecha.logApiError = ((typeof console !== "undefined" && console !== null) && (console.error != null) ? function() {
    return console.error.apply(console, arguments);
  } : function() {});

  mecha.logApiWarning = ((typeof console !== "undefined" && console !== null) && (console.warn != null) ? function() {
    return console.warn.apply(console, arguments);
  } : function() {});

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

  translateCSM = function(apiSourceCode, csmSourceCode) {
    var jsSourceCode, variablesSource;
    variablesSource = csmSourceCode.match(/var[^;]*;/g);
    csmSourceCode = (csmSourceCode.replace(/var[^;]*;/g, '')).trim();
    jsSourceCode = "\"use strict\";\n(function(){\n  /* BEGIN API */\n  \n  var exportedParameters = [];\n\n" + apiSourceCode + "\n\n  try {\n\n  /* BEGIN PARAMETERS */\n\n" + (variablesSource ? variablesSource.join('\n') : "") + "\n\n  /* BEGIN SOURCE */\n  return scene({ params: exportedParameters }" + (csmSourceCode.trim().length > 0 ? ',' : '') + "\n\n" + csmSourceCode + "\n\n  );\n  } catch(err) {\n    return String(err);\n  }\n})();";
    return jsSourceCode;
  };

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
            val: glsl.mul(glsl.index(node.attr.dimensions, 0), 0.5),
            axis: 0
          }), asm.halfspace({
            val: glsl.mul(glsl.index(node.attr.dimensions, 1), 0.5),
            axis: 1
          }), asm.halfspace({
            val: glsl.mul(glsl.index(node.attr.dimensions, 2), 0.5),
            axis: 2
          })
        ];
        return asm.mirror({
          axes: [0, 1, 2]
        }, asm.intersect(halfspaces[0], halfspaces[1], halfspaces[2]));
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
      dot: function(a, b) {
        var i, _ref, _results;
        if (typeof a === 'string' || typeof b === 'string') {
          return "dot(" + a + ", " + b + ")";
        } else if (Array.isArray(a && Array.isArray(b))) {
          if (a.length !== b.length) {
            throw "Cannot perform dot product operation with array operands of different lengths.";
          }
          if (a.length < 2 || a.length > 4) {
            throw "Cannot perform dot product operation on vectors of " + a.length + " dimensions.";
          }
          if ((isArrayType(a, 'number')) && (isArrayType(b, 'number'))) {
            _results = [];
            for (i = 0, _ref = a.length; 0 <= _ref ? i < _ref : i > _ref; 0 <= _ref ? i++ : i--) {
              _results.push(a[i] * b[i]);
            }
            return _results;
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
        } else if (Array.isArray(a && Array.isArray(b))) {
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
        } else if (Array.isArray(a && Array.isArray(b))) {
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
        } else if (Array.isArray(a && Array.isArray(b))) {
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
        } else if (Array.isArray(a && Array.isArray(b))) {
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
        } else if (Array.isArray(a && Array.isArray(min && Array.isArray(max)))) {
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
        } else if (Array.isArray(a && Array.isArray(b))) {
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
        } else if (Array.isArray(a && Array.isArray(b))) {
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
      }
    };
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
    var compileCompositeNode, compileCorner, postDispatch, preDispatch, rayOrigin;
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
          mat = gl.matrix3.newAxisRotation(node.attr.axis, -math_degToRad * node.attr.angle);
          glslCompiler.preludePush(flags.glslPrelude, "mat3(" + mat + ") * " + ro);
        } else {
          cosAngle = Math.cos(-math_degToRad * node.attr.angle);
          sinAngle = Math.sin(-math_degToRad * node.attr.angle);
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
    compileCorner = function(ro, flags, state, chamferRadius, bevelRadius) {
      var axisCombinations, cornerSize, cornerSpaces, cornerWithSigns, dist, h, radius, remainingHalfSpaces, roComponents, roWithSigns, signs, _i, _len, _ref;
      remainingHalfSpaces = 0;
      _ref = state.hs;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        h = _ref[_i];
        if (h !== null) remainingHalfSpaces += 1;
      }
      if (remainingHalfSpaces > 0) {
        cornerSpaces = 0;
        if (state.hs[0] !== null || state.hs[3] !== null) cornerSpaces += 1;
        if (state.hs[1] !== null || state.hs[4] !== null) cornerSpaces += 1;
        if (state.hs[2] !== null || state.hs[5] !== null) cornerSpaces += 1;
        radius = cornerSpaces === 1 || bevelRadius > chamferRadius ? 0 : chamferRadius;
        cornerSize = [state.hs[0] !== null ? state.hs[0] - radius : state.hs[3] !== null ? -state.hs[3] + radius : 0, state.hs[1] !== null ? state.hs[1] - radius : state.hs[4] !== null ? -state.hs[4] + radius : 0, state.hs[2] !== null ? state.hs[2] - radius : state.hs[5] !== null ? -state.hs[5] + radius : 0];
        signs = [state.hs[0] === null && state.hs[3] !== null, state.hs[1] === null && state.hs[4] !== null, state.hs[2] === null && state.hs[5] !== null];
        roComponents = [signs[0] ? "-" + ro + ".x" : "" + ro + ".x", signs[1] ? "-" + ro + ".y" : "" + ro + ".y", signs[2] ? "-" + ro + ".z" : "" + ro + ".z"];
        roWithSigns = !(signs[0] || signs[1] || signs[2]) ? "" + ro : (signs[0] || state.hs[3] === null) && (signs[1] || state.hs[4] === null) && (signs[2] || state.hs[5] === null) ? "-" + ro : glslCompiler.preludeAdd(flags.glslPrelude, "vec3(" + roComponents[0] + ", " + roComponents[1] + ", " + roComponents[2] + ")");
        cornerWithSigns = "vec3(" + cornerSize + ")";
        dist = glslCompiler.preludeAdd(flags.glslPrelude, "" + roWithSigns + " - " + cornerWithSigns);
        if (cornerSpaces > 1) {
          if (radius > 0) {
            state.codes.push(primitiveCallback("length(max(" + dist + ", 0.0)) - " + radius, flags));
          } else if (bevelRadius > 0) {
            axisCombinations = [];
            if (state.hs[0] !== null || state.hs[3] !== null) {
              axisCombinations.push(0);
            }
            if (state.hs[1] !== null || state.hs[4] !== null) {
              axisCombinations.push(1);
            }
            if (state.hs[2] !== null || state.hs[5] !== null) {
              axisCombinations.push(2);
            }
            glslCompiler.preludePush(flags.glslPrelude, "" + roComponents[axisCombinations[0]] + " + " + roComponents[axisCombinations[1]] + " - " + (cornerSize[axisCombinations[0]] + cornerSize[axisCombinations[1]] - bevelRadius), "float");
            if (axisCombinations.length === 3) {
              glslCompiler.preludePush(flags.glslPrelude, "" + roComponents[axisCombinations[0]] + " + " + roComponents[axisCombinations[2]] + " - " + (cornerSize[axisCombinations[0]] + cornerSize[axisCombinations[2]] - bevelRadius), "float");
              glslCompiler.preludePush(flags.glslPrelude, "" + roComponents[axisCombinations[1]] + " + " + roComponents[axisCombinations[2]] + " - " + (cornerSize[axisCombinations[1]] + cornerSize[axisCombinations[2]] - bevelRadius), "float");
            }
            switch (axisCombinations.length) {
              case 2:
                state.codes.push(primitiveCallback("max(length(max(" + dist + ", 0.0)), " + math_invsqrt2 + " * " + (glslCompiler.preludePop(flags.glslPrelude)) + ")", flags));
                break;
              case 3:
                state.codes.push(primitiveCallback("max(max(max(length(max(" + dist + ", 0.0)), " + math_invsqrt2 + " * " + (glslCompiler.preludePop(flags.glslPrelude)) + "), " + math_invsqrt2 + " * " + (glslCompiler.preludePop(flags.glslPrelude)) + "), " + math_invsqrt2 + " * " + (glslCompiler.preludePop(flags.glslPrelude)) + ")", flags));
            }
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
      var bevelRadius, c, chamferRadius, codes, collectCode, cornersState, h, ro, s, _i, _j, _k, _len, _len2, _len3, _ref, _results;
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
            case 'rotate':
            case 'mirror':
            case 'repeat':
            case 'invert':
            case 'material':
            case 'chamfer':
            case 'bevel':
              _results.push(collectCode(codes, node.nodes));
              break;
            default:
              _results.push(void 0);
          }
        }
        return _results;
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
      compileCorner(ro, flags, cornersState, chamferRadius, bevelRadius);
      compileCorner(ro, flags, cornersState, chamferRadius, bevelRadius);
      codes = codes.concat(cornersState.codes);
      _ref = cornersState.hs;
      for (_j = 0, _len2 = _ref.length; _j < _len2; _j++) {
        h = _ref[_j];
        if (!(h !== null)) continue;
        mecha.logInternalError("GLSL Compiler: Post-condition failed, some half spaces were not processed during corner compilation.");
        break;
      }
      node.code = codes.shift();
      _results = [];
      for (_k = 0, _len3 = codes.length; _k < _len3; _k++) {
        c = codes[_k];
        _results.push(node.code = cmpCallback(c, node.code, flags));
      }
      return _results;
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
        var index, ro, s, translateOffset, val, _i, _len;
        if (node.nodes.length !== 0) {
          mecha.logInternalError("GLSL Compiler: Halfspace node is not empty.");
          return;
        }
        /*
              ro = glslCompiler.preludeTop flags.glslPrelude # Current ray origin
              if flags.invert
                node.code = primitiveCallback (glsl.sub node.attr.val, "#{ro}[#{node.attr.axis}]"), flags
              else
                node.code = primitiveCallback (glsl.sub "#{ro}[#{node.attr.axis}]", node.attr.val), flags
              #
        */
        if (typeof node.attr.val === 'string') {
          ro = glslCompiler.preludeTop(flags.glslPrelude);
          if (flags.invert) {
            node.code = primitiveCallback(glsl.sub(node.attr.val, "" + ro + "[" + node.attr.axis + "]"), flags);
          } else {
            node.code = primitiveCallback(glsl.sub("" + ro + "[" + node.attr.axis + "]", node.attr.val), flags);
          }
        } else {
          translateOffset = 0.0;
          for (_i = 0, _len = stack.length; _i < _len; _i++) {
            s = stack[_i];
            if (s.halfSpaces != null) {
              index = node.attr.axis + (flags.invert ? 3 : 0);
              val = glsl.add(node.attr.val, translateOffset);
              if (flags.composition[flags.composition.length - 1] === glslCompiler.COMPOSITION_UNION) {
                if (s.halfSpaces[index] === null || (index < 3 && val > s.halfSpaces[index]) || (index > 2 && val < s.halfSpaces[index])) {
                  s.halfSpaces[index] = val;
                }
              } else {
                if (s.halfSpaces[index] === null || (index < 3 && val < s.halfSpaces[index]) || (index > 2 && val > s.halfSpaces[index])) {
                  s.halfSpaces[index] = val;
                }
              }
            } else {
              switch (s.type) {
                case 'translate':
                  translateOffset = glsl.add(translateOffset, s.attr.offset[node.attr.axis]);
                  continue;
                case 'invert':
                case 'mirror':
                  continue;
                default:
                  ro = glslCompiler.preludeTop(flags.glslPrelude);
                  if (flags.invert) {
                    node.code = primitiveCallback(glsl.sub(node.attr.val, "" + ro + "[" + node.attr.axis + "]"), flags);
                  } else {
                    node.code = primitiveCallback(glsl.sub("" + ro + "[" + node.attr.axis + "]", node.attr.val), flags);
                  }
              }
            }
            break;
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
    id = glslCompiler.preludeAdd(flags.glslPrelude, '-1', 'int');
    result = new toStringPrototype("" + memoA + " < " + memoB + "? (" + id + " = " + a.materialId + ", " + memoA + ") : (" + id + " = " + b.materialId + ", " + memoB + ")");
    result.materialId = id;
    return result;
  }), (function(a, b, flags) {
    var id, memoA, memoB, result;
    memoA = glslCompiler.preludeAdd(flags.glslPrelude, String(a), 'float');
    memoB = glslCompiler.preludeAdd(flags.glslPrelude, String(b), 'float');
    id = glslCompiler.preludeAdd(flags.glslPrelude, '-1', 'int');
    result = new toStringPrototype("" + memoA + " > " + memoB + "? (" + id + " = " + a.materialId + ", " + memoA + ") : (" + id + " = " + b.materialId + ", " + memoB + ")");
    result.materialId = id;
    return result;
  }), (function(oldVal, newVal) {
    var result;
    result = new toStringPrototype(newVal);
    result.materialId = oldVal.materialId;
    return result;
  }));

  compileGLSL = function(abstractSolidModel, params) {
    var fragmentShader, rayDirection, rayOrigin, shaders, usePerspectiveProjection, vertexShader;
    rayOrigin = 'ro';
    rayDirection = 'rd';
    usePerspectiveProjection = false;
    console.log("ASM:");
    console.log(abstractSolidModel);
    vertexShader = function() {
      var bounds, boundsResult, sceneTranslation;
      boundsResult = compileASMBounds(abstractSolidModel);
      if (boundsResult.nodes.length !== 1) {
        mecha.logInternalError('GLSL Compiler: Expected exactly one result node from the bounding box compiler.');
      }
      bounds = boundsResult.nodes[0].bounds;
      /* TEMPORARY
      console.log "Bounds Result:"
      console.log boundsResult
      */
      sceneTranslation = [isFinite(bounds[0][0]) && isFinite(bounds[1][0]) ? bounds[0][0] + bounds[1][0] : '0.0', isFinite(bounds[0][1]) && isFinite(bounds[1][1]) ? bounds[0][1] + bounds[1][1] : '0.0', isFinite(bounds[0][2]) && isFinite(bounds[1][2]) ? bounds[0][2] + bounds[1][2] : '0.0'];
      return "const float Infinity = (1.0/0.0);\nconst vec3 sceneScale = vec3(" + (bounds[1][0] - bounds[0][0]) + ", " + (bounds[1][1] - bounds[0][1]) + ", " + (bounds[1][2] - bounds[0][2]) + ");\nconst vec3 sceneTranslation = vec3(" + sceneTranslation + ");\nuniform mat4 projection;\nuniform mat4 view;\nuniform mat3 model;\nattribute vec3 position;\nvarying vec3 modelPosition;\n" + (usePerspectiveProjection ? "varying vec3 viewPosition;" : "") + "\nvoid main(void) {\n  modelPosition = position;\n  " + (usePerspectiveProjection ? "viewPosition = (view * vec4(position, 1.0)).xyz;" : "") + "\n  gl_Position = projection * view * vec4(model * position, 1.0);\n}\n";
    };
    fragmentShader = function() {
      var distanceCode, distancePreludeCode, distanceResult, generateUniforms, idCode, idPreludeCode, idResult, sceneMaterial;
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
      /* TEMPORARY
      console.log "Id Result:"
      console.log idResult
      */
      sceneMaterial = function(materials) {
        var binarySearch, i, m, result, _ref;
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
      return "#ifdef GL_ES\n  precision highp float;\n#endif\nconst float Infinity = (1.0/0.0);\nuniform mat4 view;\nuniform mat3 model;\nvarying vec3 modelPosition;\n" + (usePerspectiveProjection ? "varying vec3 viewPosition;" : "") + "\n\n" + (generateUniforms(params)) + "\n\n" + (glslLibrary.compile(distanceResult.flags.glslFunctions)) + "\n\nfloat sceneDist(in vec3 " + rayOrigin + ") {\n  " + (distancePreludeCode != null ? distancePreludeCode : '') + "\n  return max(0.0," + (distanceCode != null ? distanceCode : 'Infinity') + ");\n}\n\nvec3 sceneNormal(in vec3 p) {\n  const float eps = 0.00001;\n  vec3 n;\n  n.x = sceneDist( vec3(p.x+eps, p.yz) ) - sceneDist( vec3(p.x-eps, p.yz) );\n  n.y = sceneDist( vec3(p.x, p.y+eps, p.z) ) - sceneDist( vec3(p.x, p.y-eps, p.z) );\n  n.z = sceneDist( vec3(p.xy, p.z+eps) ) - sceneDist( vec3(p.xy, p.z-eps) );\n  return normalize(n);\n}\n\nint sceneId(in vec3 " + rayOrigin + ") {\n  " + (idPreludeCode != null ? idPreludeCode : '') + "\n  " + (idCode != null ? idCode + ';' : '') + "\n  return " + (idCode != null ? idCode.materialId : '-1') + ";\n}\n\n" + (sceneMaterial(idResult.flags.materials)) + "\n\nvoid main(void) {\n  // Constants\n  const int steps = 64;\n  const float threshold = 0.005;\n  \n  vec3 rayOrigin = modelPosition;\n  vec3 rayDir = vec3(0.0,0.0,-1.0) * mat3(view) * model;\n  vec3 prevRayOrigin = rayOrigin;\n  bool hit = false;\n  float dist = Infinity;\n  //float prevDist = (1.0/0.0);\n  //float bias = 0.0; // corrective bias for the step size\n  //float minDist = (1.0/0.0);\n  for(int i = 0; i < steps; i++) {\n    //dist = sceneRayDist(rayOrigin, rayDir);\n    //prevDist = dist;\n    dist = sceneDist(rayOrigin);\n    //minDist = min(minDist, dist);\n    if (dist <= 0.0) {\n      hit = true;\n      break;\n    }\n    prevRayOrigin = rayOrigin;\n    //rayOrigin += (max(dist, threshold) + bias) * rayDir;\n    rayOrigin += max(dist, threshold) * rayDir;\n    if (all(notEqual(clamp(rayOrigin, vec3(-1.0), vec3(1.0)), rayOrigin))) { break; }\n  }\n  vec3 absRayOrigin = abs(rayOrigin);\n  //if(!hit && max(max(absRayOrigin.x, absRayOrigin.y), absRayOrigin.z) >= 1.0) { discard; }\n  //if(!hit && prevDist >= dist) { discard; }\n  if(!hit) { discard; }\n  //if(!hit) { gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0); return; }\n  //const vec3 diffuseColor = vec3(0.1, 0.2, 0.8);\n  vec3 diffuseColor = sceneMaterial(prevRayOrigin);\n  //const vec3 specularColor = vec3(1.0, 1.0, 1.0);\n        \n  // Lighting parameters\n  const float ambientFactor = 0.7;\n  const float diffuseFactor = 1.0 - ambientFactor;\n  const vec3 lightPos = vec3(1.5,2.5, 4.0);\n  vec3 ldir = normalize(lightPos - prevRayOrigin);\n\n  /* Regular diffuse shading\n  vec3 diffuse = diffuseColor * (ambientFactor + diffuseFactor * dot(sceneNormal(prevRayOrigin), ldir));\n  //*/\n\n  //* Cartoon rendering\n  vec3 diffuse = diffuseColor * (ambientFactor + diffuseFactor * dot(sceneNormal(prevRayOrigin), ldir));\n  gl_FragColor = vec4(diffuse, 1.0);\n  //*/\n}\n";
    };
    shaders = [vertexShader(), fragmentShader()];
    return shaders;
  };

  exports = exports != null ? exports : {};

  exports.translateCSM = translateCSM;

  exports.compileASM = compileASM;

  exports.compileGLSL = compileGLSL;

  return exports;

}).call(this);
