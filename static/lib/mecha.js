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
    try {
      variablesSource = csmSourceCode.match(/var[^;]*;/g);
      csmSourceCode = (csmSourceCode.replace(/var[^;]*;/g, '')).trim();
      jsSourceCode = "\"use strict\";\n(function(){\n  /* BEGIN API */\n  \n  var exportedParameters = [];\n\n" + apiSourceCode + "\n\n  try {\n\n  /* BEGIN PARAMETERS */\n\n" + (variablesSource ? variablesSource.join('\n') : "") + "\n\n  /* BEGIN SOURCE */\n  return scene({ params: exportedParameters }" + (csmSourceCode.trim().length > 0 ? ',' : '') + "\n\n" + csmSourceCode + "\n\n  );\n  } catch(err) {\n    return String(err);\n  }\n})();";
      return jsSourceCode;
    } catch (error) {
      mecha.logInternalError("Exception occurred in `mecha.generator.translateCSM`:\n", error);
      return '';
    }
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
    try {
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
          */          return asm.mirror({
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
            (radiusVec = [0.0, 0.0, 0.0])[upAxis] = node.attr.radius;
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
              angle: glsl.mul(0.5, node.attr.angle)
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
    } catch (error) {
      mecha.logInternalError("Exception occurred in `mecha.generator.compileASM`:\n", error);
      return asm.union();
    }
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
      cos: function(a) {
        if (typeof a === 'number') {
          return Math.cos(a);
        } else {
          return "cos(" + a + ")";
        }
      },
      sin: function(a) {
        if (typeof a === 'number') {
          return Math.sin(a);
        } else {
          return "sin(" + a + ")";
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
    var compileCompositeNode, postDispatch, preDispatch, rayOrigin;
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
          cosAngle = glsl.cos(glsl.mul(-math_degToRad, node.attr.angle));
          sinAngle = glsl.sin(glsl.mul(-math_degToRad, node.attr.angle));
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
    /*
    
      # TODO: This is overly complex and broken... need a better optimization method for corners....
      # (Perhaps one that lets the GLSL compiler precompute operations between uniforms (e.g. glsl.min(param0, param1)
    
      compileCorner = (ro, flags, state, chamferRadius, bevelRadius) ->
        remainingHalfSpaces = 0
        remainingHalfSpaces += 1 for h in state.hs when h != null
    
        #if remainingHalfSpaces == 1
        #  # Find the axis (from 0 to 5) for the halfSpace node
        #  for index in [0..5] when state.hs[index] != null
        #    state.codes.push primitiveCallback (if index > 2 then "#{ro}[#{index - 3}] - #{state.hs[index]}" else "-#{ro}[#{index}] + #{state.hs[index]}"), flags
        #    state.hs[index] = null
        #    break
        #  remainingHalfSpaces -= 1
        #else if remainingHalfSpaces > 1
        if remainingHalfSpaces > 0
          cornerSpaces = 0
          cornerSpaces += 1 if state.hs[0] != null or state.hs[3] != null
          cornerSpaces += 1 if state.hs[1] != null or state.hs[4] != null
          cornerSpaces += 1 if state.hs[2] != null or state.hs[5] != null
          chamferRadius = 0 if cornerSpaces == 1 or bevelRadius != 0
          cornerSize = [
            if state.hs[0] != null then (glsl.sub state.hs[0], radius) else if state.hs[3] != null then (glsl.sub radius, state.hs[3]) else 0, #TODO: zero for cornersize might be the wrong choice... (possibly something large instead?)
            if state.hs[1] != null then (glsl.sub state.hs[1], radius) else if state.hs[4] != null then (glsl.sub radius, state.hs[4]) else 0,
            if state.hs[2] != null then (glsl.sub state.hs[2], radius) else if state.hs[5] != null then (glsl.sub radius, state.hs[5]) else 0]
          signs = [
            state.hs[0] == null and state.hs[3] != null,
            state.hs[1] == null and state.hs[4] != null,
            state.hs[2] == null and state.hs[5] != null]
          roComponents  = [
            if signs[0] then "-#{ro}.x" else "#{ro}.x", 
            if signs[1] then "-#{ro}.y" else "#{ro}.y", 
            if signs[2] then "-#{ro}.z" else "#{ro}.z"]
          roWithSigns = 
            if not (signs[0] or signs[1] or signs[2])
              "#{ro}"
            else if (signs[0] or state.hs[3] == null) and (signs[1] or state.hs[4] == null) and (signs[2] or state.hs[5] == null)
              "-#{ro}"
            else
              glslCompiler.preludeAdd flags.glslPrelude, "vec3(#{roComponents[0]}, #{roComponents[1]}, #{roComponents[2]})"
          cornerWithSigns = glsl.vec3Lit cornerSize
          dist = glslCompiler.preludeAdd flags.glslPrelude, "#{roWithSigns} - #{glsl.vec3Lit cornerSize}"
    
          # Special cases
          if cornerSpaces > 1
            if radius > 0
              state.codes.push primitiveCallback "length(max(#{dist}, 0.0)) - #{radius}", flags
            else if bevelRadius > 0
              axisCombinations = []
              axisCombinations.push 0 if state.hs[0] != null or state.hs[3] != null
              axisCombinations.push 1 if state.hs[1] != null or state.hs[4] != null
              axisCombinations.push 2 if state.hs[2] != null or state.hs[5] != null
              # TODO: assert(axisCombinations.length >= 2)
              glslCompiler.preludePush flags.glslPrelude, "#{roComponents[axisCombinations[0]]} + #{roComponents[axisCombinations[1]]} - #{cornerSize[axisCombinations[0]] + cornerSize[axisCombinations[1]] - bevelRadius}", "float"
              if axisCombinations.length == 3
                glslCompiler.preludePush flags.glslPrelude, "#{roComponents[axisCombinations[0]]} + #{roComponents[axisCombinations[2]]} - #{cornerSize[axisCombinations[0]] + cornerSize[axisCombinations[2]] - bevelRadius}", "float"
                glslCompiler.preludePush flags.glslPrelude, "#{roComponents[axisCombinations[1]]} + #{roComponents[axisCombinations[2]]} - #{cornerSize[axisCombinations[1]] + cornerSize[axisCombinations[2]] - bevelRadius}", "float"
              switch axisCombinations.length
                when 2
                  state.codes.push primitiveCallback "max(length(max(#{dist}, 0.0)), #{math_invsqrt2} * #{glslCompiler.preludePop flags.glslPrelude})", flags
                when 3
                  state.codes.push primitiveCallback "max(max(max(length(max(#{dist}, 0.0)), #{math_invsqrt2} * #{glslCompiler.preludePop flags.glslPrelude}), #{math_invsqrt2} * #{glslCompiler.preludePop flags.glslPrelude}), #{math_invsqrt2} * #{glslCompiler.preludePop flags.glslPrelude})", flags
            else # bevelRadius == chamferRadius == 0
              state.codes.push primitiveCallback "length(max(#{dist}, 0.0))", flags
            if state.hs[0] != null or state.hs[3] != null
              if state.hs[0] != null then state.hs[0] = null else state.hs[3] = null
            if state.hs[1] != null or state.hs[4] != null
              if state.hs[1] != null then state.hs[1] = null else state.hs[4] = null
            if state.hs[2] != null or state.hs[5] != null
              if state.hs[2] != null then state.hs[2] = null else state.hs[5] = null
            remainingHalfSpaces -= cornerSpaces
          else
            # General cases
            if state.hs[0] != null or state.hs[3] != null
              state.codes.push primitiveCallback "#{dist}.x", flags
              if state.hs[0] != null then state.hs[0] = null else state.hs[3] = null
            else if state.hs[1] != null or state.hs[4] != null
              state.codes.push primitiveCallback "#{dist}.y", flags
              if state.hs[1] != null then state.hs[1] = null else state.hs[4] = null
            else if state.hs[2] != null or state.hs[5] != null
              state.codes.push primitiveCallback "#{dist}.z", flags
              if state.hs[2] != null then state.hs[2] = null else state.hs[5] = null
            remainingHalfSpaces -= 1
        return
    */
    compileCompositeNode = function(name, cmpCallback, stack, node, flags) {
      var bevelRadius, c, chamferRadius, codes, collectCode, cornersState, h, ro, s, _i, _j, _k, _len, _len2, _len3, _ref;
      if (node.nodes.length === 0) {
        mecha.logInternalError("GLSL Compiler: Union node is empty.");
        return;
      }
      codes = [];
      collectCode = function(codes, nodes) {
        var node, _i, _len;
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
              collectCode(codes, node.nodes);
          }
        }
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
      /* Compile the first and a possible second corner
      compileCorner ro, flags, cornersState, chamferRadius, bevelRadius
      compileCorner ro, flags, cornersState, chamferRadius, bevelRadius
      codes = codes.concat cornersState.codes
      #
      */
      _ref = cornersState.hs;
      for (_j = 0, _len2 = _ref.length; _j < _len2; _j++) {
        h = _ref[_j];
        if (!(h !== null)) continue;
        mecha.logInternalError("GLSL Compiler: Post-condition failed, some half spaces were not processed during corner compilation.");
        break;
      }
      node.code = codes.shift();
      for (_k = 0, _len3 = codes.length; _k < _len3; _k++) {
        c = codes[_k];
        node.code = cmpCallback(c, node.code, flags);
      }
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
        var ro;
        if (node.nodes.length !== 0) {
          mecha.logInternalError("GLSL Compiler: Halfspace node is not empty.");
          return;
        }
        ro = glslCompiler.preludeTop(flags.glslPrelude);
        if (flags.invert) {
          node.code = primitiveCallback(glsl.sub(node.attr.val, "" + ro + "[" + node.attr.axis + "]"), flags);
        } else {
          node.code = primitiveCallback(glsl.sub("" + ro + "[" + node.attr.axis + "]", node.attr.val), flags);
        }
        /* Generate half-space primitive when it cannot be compiled into a corner
        #if typeof node.attr.val == 'string'
        #  ro = glslCompiler.preludeTop flags.glslPrelude # Current ray origin
        #  if flags.invert
        #    node.code = primitiveCallback (glsl.sub node.attr.val, "#{ro}[#{node.attr.axis}]"), flags
        #  else
        #    node.code = primitiveCallback (glsl.sub "#{ro}[#{node.attr.axis}]", node.attr.val), flags
        #else
        # Bin half-spaces for corner compilation
        translateOffset = 0.0
        for s in stack
          if s.halfSpaces?
            # Assign to the halfspace bins for corner compilation
            index = node.attr.axis + (if flags.invert then 3 else 0)
            val = glsl.add node.attr.val, translateOffset
            s.halfSpaces[index] =
              if s.halfSpaces[index] == null
                 val
              else if flags.composition[flags.composition.length - 1] == glslCompiler.COMPOSITION_UNION
                if index < 3
                  glsl.max s.halfSpaces[index], val
                else
                  glsl.min s.halfSpaces[index], val
              else
                if index < 3
                  glsl.min s.halfSpaces[index], val
                else
                  glsl.max s.halfSpaces[index], val
          else
            switch s.type
              when 'translate'
                translateOffset = glsl.add translateOffset, s.attr.offset[node.attr.axis]
                continue # Search for preceding intersect/union node 
              when 'invert', 'mirror'
                continue # Search for preceding intersect/union node
              else
                # This may occur in special cases where we cannot do normal corner compilation
                # (Such as a separate transformation on the plane itself - with a wedge node for example)
                ro = glslCompiler.preludeTop flags.glslPrelude # Current ray origin
                if flags.invert
                  node.code = primitiveCallback (glsl.sub node.attr.val, "#{ro}[#{node.attr.axis}]"), flags
                else
                  node.code = primitiveCallback (glsl.sub "#{ro}[#{node.attr.axis}]", node.attr.val), flags
          break
        #
        */
        return stack[0].nodes.push(node);
      },
      corner: function(stack, node, flags) {
        var bevelRadius, chamferRadius, cornerDist, cornerVal, diagonalDist, dist, ro, roSigned, s, _i, _len;
        ro = glslCompiler.preludeTop(flags.glslPrelude);
        dist = glslCompiler.preludeAdd(flags.glslPrelude, glsl.sub(ro, node.attr.val));
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
        if (bevelRadius !== 0) {
          roSigned = glslCompiler.preludeAdd(flags.glslPrelude, flags.invert ? "-" + ro : "" + ro);
          cornerVal = typeof node.attr.val === 'string' ? glslCompiler.preludeAdd(flags.glslPrelude, node.attr.val) : node.attr.val;
          diagonalDist = ["(" + roSigned + "[0] + " + roSigned + "[1] - (" + (glsl.add(glsl.index(cornerVal, 0), glsl.index(cornerVal, 1))) + "))", "(" + roSigned + "[0] + " + roSigned + "[2] - (" + (glsl.add(glsl.index(cornerVal, 0), glsl.index(cornerVal, 2))) + "))", "(" + roSigned + "[1] + " + roSigned + "[2] - (" + (glsl.add(glsl.index(cornerVal, 1), glsl.index(cornerVal, 2))) + "))"];
          if (flags.invert) {
            cornerDist = "length(min(" + dist + ", 0.0))";
            node.code = primitiveCallback("min(min(min(" + cornerDist + ", " + math_invsqrt2 + " * " + (glsl.index(diagonalDist, 0)) + " - " + bevelRadius + "), " + math_invsqrt2 + " * " + (glsl.index(diagonalDist, 1)) + " - " + bevelRadius + "), " + math_invsqrt2 + " * " + (glsl.index(diagonalDist, 2)) + " - " + bevelRadius + ")", flags);
          } else {
            cornerDist = "length(max(" + dist + ", 0.0))";
            node.code = primitiveCallback("max(max(max(" + cornerDist + ", " + math_invsqrt2 + " * " + (glsl.index(diagonalDist, 0)) + " + " + bevelRadius + "), " + math_invsqrt2 + " * " + (glsl.index(diagonalDist, 1)) + " + " + bevelRadius + "), " + math_invsqrt2 + " * " + (glsl.index(diagonalDist, 2)) + " + " + bevelRadius + ")", flags);
          }
        } else if (chamferRadius !== 0) {
          if (flags.invert) {
            node.code = primitiveCallback("length(min(" + (glsl.add(dist, chamferRadius)) + ", 0.0)) - " + chamferRadius, flags);
          } else {
            node.code = primitiveCallback("length(max(" + (glsl.add(dist, chamferRadius)) + ", 0.0)) - " + chamferRadius, flags);
          }
        } else {
          if (flags.invert) {
            node.code = primitiveCallback("length(min(" + dist + ", 0.0))", flags);
          } else {
            node.code = primitiveCallback("length(max(" + dist + ", 0.0))", flags);
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
    try {
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
        return "#ifdef GL_ES\n  precision highp float;\n#endif\nconst float Infinity = (1.0/0.0);\nuniform mat4 view;\nuniform mat3 model;\nvarying vec3 modelPosition;\n" + (usePerspectiveProjection ? "varying vec3 viewPosition;" : "") + "\n\n" + (generateUniforms(params)) + "\n\n" + (glslLibrary.compile(distanceResult.flags.glslFunctions)) + "\n\nfloat sceneDist(in vec3 " + rayOrigin + ") {\n  " + (distancePreludeCode != null ? distancePreludeCode : '') + "\n  return max(0.0," + (distanceCode != null ? distanceCode : 'Infinity') + ");\n}\n\nvec3 sceneNormal(in vec3 p) {\n  const float eps = 0.00001;\n  vec3 n;\n  n.x = sceneDist( vec3(p.x+eps, p.yz) ) - sceneDist( vec3(p.x-eps, p.yz) );\n  n.y = sceneDist( vec3(p.x, p.y+eps, p.z) ) - sceneDist( vec3(p.x, p.y-eps, p.z) );\n  n.z = sceneDist( vec3(p.xy, p.z+eps) ) - sceneDist( vec3(p.xy, p.z-eps) );\n  return normalize(n);\n}\n\nint sceneId(in vec3 " + rayOrigin + ") {\n  " + (idPreludeCode != null ? idPreludeCode : '') + "\n  " + (idCode != null ? idCode + ';' : '') + "\n  return " + (idCode != null ? idCode.materialId : '-1') + ";\n}\n\n" + (sceneMaterial(idResult.flags.materials)) + "\n\nvoid main(void) {\n  // Constants\n  const int steps = 84;\n  const float threshold = 0.005;\n  \n  vec3 rayOrigin = modelPosition;\n  vec3 rayDir = vec3(0.0,0.0,-1.0) * mat3(view) * model;\n  vec3 prevRayOrigin = rayOrigin;\n  bool hit = false;\n  float dist = Infinity;\n  //float prevDist = (1.0/0.0);\n  //float bias = 0.0; // corrective bias for the step size\n  //float minDist = (1.0/0.0);\n  for(int i = 0; i < steps; i++) {\n    //dist = sceneRayDist(rayOrigin, rayDir);\n    //prevDist = dist;\n    dist = sceneDist(rayOrigin);\n    //minDist = min(minDist, dist);\n    if (dist <= 0.0) {\n      hit = true;\n      break;\n    }\n    prevRayOrigin = rayOrigin;\n    //rayOrigin += (max(dist, threshold) + bias) * rayDir;\n    rayOrigin += max(dist, threshold) * rayDir;\n    if (all(notEqual(clamp(rayOrigin, vec3(-1.0), vec3(1.0)), rayOrigin))) { break; }\n  }\n  vec3 absRayOrigin = abs(rayOrigin);\n  //if(!hit && max(max(absRayOrigin.x, absRayOrigin.y), absRayOrigin.z) >= 1.0) { discard; }\n  //if(!hit && prevDist >= dist) { discard; }\n  if(!hit) { discard; }\n  //if(!hit) { gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0); return; }\n  //const vec3 diffuseColor = vec3(0.1, 0.2, 0.8);\n  vec3 diffuseColor = sceneMaterial(prevRayOrigin);\n  //const vec3 specularColor = vec3(1.0, 1.0, 1.0);\n        \n  // Lighting parameters\n  const float specularFactor = 0.3;\n  const float specularPhongShininess = 10.0;\n  const vec3 lightPos = vec3(1.5,2.5, 4.0);\n  vec3 lightDir = normalize(lightPos - prevRayOrigin);\n  vec3 normal = sceneNormal(prevRayOrigin);\n\n  //* Diffuse shading\n  float diffuse = dot(normal, lightDir);\n  //*/\n  //* Phong reflection model\n  vec3 reflectDir = reflect(-rayDir, normal);\n  vec3 specular = vec3(specularFactor * pow(max(dot(reflectDir, rayDir), 0.0), specularPhongShininess));\n  //*/\n\n  //* Regular shading\n  const float ambientFactor = 0.7;\n  const float diffuseFactor = 1.0 - ambientFactor;\n  diffuse = ambientFactor + diffuse * diffuseFactor;      \n  //*/\n\n  /* Cel shading\n  const float cellA = 0.3;\n  const float cellB = 0.4;\n  const float cellC = 0.5;\n  const float cellD = 1.0 - cellA;\n  diffuse = cellA + max(step(cellA, diffuse)*cellA, max(step(cellB, diffuse)*cellB, max(step(cellC, diffuse)*cellC, step(cellD, diffuse)*cellD)));\n  //*/\n\n  //* Ambient occlusion\n  const float aoIterations = 5.0;\n  const float aoFactor = 2.0;\n  const float aoDistanceFactor = 1.6;\n  const float aoDistanceDelta = 0.1 / 5.0;\n  float ao = 1.0;\n  float invPow2 = 1.0;\n  vec3 aoDirDist = normal * aoDistanceDelta;\n  vec3 aoPos = prevRayOrigin;\n  for (float i = 1.0; i < (aoIterations + 1.0);  i += 1.0) {\n    invPow2 *= aoDistanceFactor * 0.5;\n    aoPos += aoDirDist;\n    ao -= aoFactor * invPow2 * (i * aoDistanceDelta - sceneDist(aoPos));\n  }\n  diffuse *= max(ao, 0.0);\n  //*/\n  \n  gl_FragColor = vec4(diffuseColor * diffuse + specular, 1.0);\n}\n";
      };
      shaders = [vertexShader(), fragmentShader()];
      return shaders;
    } catch (error) {
      mecha.logInternalError("Exception occurred in `mecha.generator.compileGLSL`:\n", error);
      return [null, null];
    }
  };

  exports = exports != null ? exports : {};

  exports.translateCSM = translateCSM;

  exports.compileASM = compileASM;

  exports.compileGLSL = compileGLSL;

  return exports;

}).call(this);


/*
 * Copyright 2011, CircuitHub.com
 */
var mecha = mecha || {}; /* Redeclaring mecha is fine: behaves like a no-op (https://developer.mozilla.org/en/JavaScript/Reference/Scope_Cheatsheet) */

mecha.editor = 
(function() {

  "use strict";

  var create, exports, getSourceCode, translateSugaredJS;

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

  translateSugaredJS = function(csmSourceCode) {
    return csmSourceCode;
  };

  create = function(domElement, sourceCode) {
    try {
      if (!(sourceCode != null)) sourceCode = "";
      domElement.innerHTML = "<span><input id='mecha-source-autocompile' name='mecha-source-autocompile' type='checkbox' disabled='disabled'><label id='mecha-source-autocompile-label' for='mecha-source-autocompile'>Auto-compile</label></span>\n<input id='mecha-source-compile' name='mecha-source-compile' type='button' value='Compile'>\n<textarea id='mecha-source-code' name='mecha-source-code'>\n" + sourceCode + "\n</textarea>";
    } catch (error) {
      mecha.logInternalError("Exception occurred in `mecha.editor.create`:\n", error);
    }
  };

  getSourceCode = function() {
    try {
      return ($('#mecha-source-code')).val();
    } catch (error) {
      mecha.logInternalError("Exception occurred in `mecha.gui.createControls`:\n", error);
      return '';
    }
  };

  exports = exports != null ? exports : {};

  exports.create = create;

  exports.getSourceCode = getSourceCode;

  return exports;

}).call(this);


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
    try {
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
    } catch (error) {
      mecha.logInternalError("Exception occurred in `mecha.renderer.modelShaders`:\n", error);
      return false;
    }
  };

  modelArguments = function(modelName, args) {
    var name, val;
    try {
      for (name in args) {
        val = args[name];
        (gl(modelName)).uniform(name, val);
      }
    } catch (error) {
      mecha.logInternalError("Exception occurred in `mecha.renderer.modelArguments`:\n", error);
    }
  };

  modelRotate = function(modelName, angles) {
    try {
      gl.matrix3.rotateZY(state.rotation, state.rotation, angles);
      (gl(modelName)).uniform('model', state.rotation);
    } catch (error) {
      mecha.logInternalError("Exception occured in `mecha.renderer.modelRotate`:\n", error);
    }
  };

  createScene = function(context) {
    var ibo, indices, positions, vbo;
    try {
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
      }).vertexAttrib('position', vbo, 9 * 8, gl.FLOAT, 3, false, 0, 0).vertexElem(ibo, 6 * 6, gl.UNSIGNED_SHORT, 0).uniform('view', gl.matrix4.newLookAt([10.0, 10.0, 10.0], [0.0, 0.0, 0.0], [0.0, 0.0, 1.0])).uniform('projection', gl.matrix4.newOrtho(-math_sqrt2, math_sqrt2, -math_sqrt2, math_sqrt2, 0.1, 100.0)).uniform('model', state.rotation).triangles();
    } catch (error) {
      mecha.logInternalError("Exception occurred in `mecha.renderer.createScene`:\n", error);
    }
  };

  runScene = function(canvas, idleCallback) {
    var callback;
    try {
      state.context.viewport(0, 0, canvas.width, canvas.height);
      state.context.clearColor(0.0, 0.0, 0.0, 0.0);
      callback = function() {
        if (gl.update()) {
          state.context.clear(state.context.DEPTH_BUFFER_BIT | state.context.COLOR_BUFFER_BIT);
          (gl('scene')).render(state.context);
        } else {
          idleCallback();
        }
        return self.nextFrame = window.requestAnimationFrame(callback, canvas);
      };
      state.nextFrame = window.requestAnimationFrame(callback, canvas);
    } catch (error) {
      mecha.logInternalError("Exception occurred in `mecha.renderer.runScene`:\n", error);
    }
  };

  exports = exports != null ? exports : {};

  exports.createScene = createScene;

  exports.runScene = runScene;

  exports.modelShaders = modelShaders;

  exports.modelArguments = modelArguments;

  exports.modelRotate = modelRotate;

  return exports;

}).call(this);


/*
 * Copyright 2011, CircuitHub.com
 */
var mecha = mecha || {}; /* Redeclaring mecha is fine: behaves like a no-op (https://developer.mozilla.org/en/JavaScript/Reference/Scope_Cheatsheet) */

mecha.gui = 
(function() {

  "use strict";

  var apiInit, canvasInit, constants, controlsInit, controlsParamChange, controlsSourceCompile, create, createControls, exports, gl, init, keyDown, math_degToRad, math_invsqrt2, math_radToDeg, math_sqrt2, mouseCoordsWithinElement, mouseDown, mouseMove, mouseUp, mouseWheel, registerControlEvents, registerDOMEvents, registerEditorEvents, sceneIdle, sceneInit, state, windowResize;

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

  windowResize = function() {
    try {

    } catch (error) {
      mecha.logInternalError("Exception occurred in `mecha.gui.windowResize`:\n", error);
    }
  };

  mouseDown = function(event) {
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
  };

  mouseUp = function(event) {
    try {
      switch (event.which) {
        case 1:
          state.viewport.mouse.leftDown = false;
          state.viewport.mouse.leftDragDistance = 0;
          break;
        case 2:
          state.viewport.mouse.middleDown = false;
          state.viewport.mouse.middleDragDistance = 0;
      }
    } catch (error) {

    }
  };

  mouseMove = function(event) {
    var delta, deltaLength, orbitAngles;
    try {
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
      state.viewport.mouse.last = [event.clientX, event.clientY];
    } catch (error) {

    }
  };

  mouseWheel = function(event) {
    var delta, zoomDistance;
    try {
      delta = event.wheelDelta != null ? event.wheelDelta / -120.0 : Math.clamp(event.detail, -1.0, 1.0);
      zoomDistance = delta * constants.camera.zoomSpeedFactor;
    } catch (error) {
      mecha.logInternalError("Exception occurred in `mecha.gui.mouseWheel`:\n", error);
    }
  };

  keyDown = function(event) {
    try {

    } catch (error) {
      mecha.logInternalError("Exception occurred in `mecha.gui.keyDown`:\n", error);
    }
  };

  controlsSourceCompile = function() {
    try {
      sceneInit();
    } catch (error) {
      mecha.logInternalError("Exception occurred in `mecha.gui.controlsSourceCompile`:\n", error);
    }
  };

  controlsParamChange = function(event) {
    var model, paramIndex, paramName, splitElName;
    try {
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
    } catch (error) {
      mecha.logInternalError("Exception occurred in `mecha.gui.controlsParamChange`:\n", error);
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

  registerEditorEvents = function() {
    return ($('#mecha-source-compile')).click(controlsSourceCompile);
  };

  registerControlEvents = function() {
    ($('#mecha-param-inputs')).delegate('.mecha-param-range', 'change', controlsParamChange);
    return ($('#mecha-param-inputs')).delegate('.mecha-param-number', 'change', controlsParamChange);
  };

  sceneIdle = function() {
    try {

    } catch (error) {
      mecha.logInternalError("Exception occurred in `mecha.gui.sceneIdle`:\n", error);
    }
  };

  canvasInit = function() {
    return windowResize();
  };

  sceneInit = function() {
    var csmSourceCode, requestId;
    try {
      csmSourceCode = mecha.generator.translateCSM(state.api.sourceCode, mecha.editor.getSourceCode());
      requestId = JSandbox.eval({
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
    } catch (error) {
      mecha.logInternalError("Exception occurred in `mecha.gui.sceneInit`:\n", error);
    }
  };

  controlsInit = function() {
    var el, html, model, name, param, stepAttr, val, _ref, _ref2;
    try {
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
    } catch (error) {
      mecha.logInternalError("Exception occurred in `mecha.gui.controlsInit`:\n", error);
    }
  };

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

  create = function(container, jsandboxUrl, mechaUrlRoot) {
    var containerEl, errorHtml;
    try {
      errorHtml = "<div>Could not create Mecha GUI. Please see the console for error messages.</div>";
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
      containerEl.innerHTML = "<canvas id='mecha-canvas' width='512' height='512'>\n  <p>This application requires a browser that supports the<a href='http://www.w3.org/html/wg/html5/'>HTML5</a>&lt;canvas&gt; feature.</p>\n</canvas>" + containerEl.innerHTML;
      if (jsandboxUrl != null) state.paths.jsandboxUrl = jsandboxUrl;
      if (mechaUrlRoot != null) state.paths.mechaUrlRoot = mechaUrlRoot;
      if (state.paths.jsandboxUrl != null) {
        JSandbox.create(state.paths.jsandboxUrl);
      }
      init(containerEl, document.getElementById('mecha-canvas'));
      return true;
    } catch (error) {
      mecha.logInternalError("Exception occurred in `mecha.gui.create`:\n", error);
      return false;
    }
  };

  createControls = function(container) {
    var containerEl;
    try {
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
    } catch (error) {
      mecha.logInternalError("Exception occurred in `mecha.gui.createControls`:\n", error);
      return false;
    }
  };

  exports = exports != null ? exports : {};

  exports.create = create;

  exports.createControls = createControls;

  return exports;

}).call(this);
