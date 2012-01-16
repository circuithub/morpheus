/*
 * Copyright 2011, CircuitHub.com
 */
var mecha = mecha || {}; /* Redeclaring mecha is fine: behaves like a no-op (https://developer.mozilla.org/en/JavaScript/Reference/Scope_Cheatsheet) */

mecha.api = 
(function() {
  var exports;
  var __slice = Array.prototype.slice;

  (function() {
    var Api, Dispatcher, MechaExpression, MechaParameter, dispatch, extend, globalParamIndex, mechaPrimitiveTypeof, mechaTypeof;
    extend = function(obj, mixin) {
      var method, name;
      for (name in mixin) {
        method = mixin[name];
        obj[name] = method;
      }
      return obj;
    };
    mechaTypeof = function(value) {
      if (Array.isArray(value)) {
        if (value.length <= 4) {
          return "vec" + value.length;
        } else {
          return 'unknown';
        }
      } else {
        return 'float';
      }
    };
    mechaPrimitiveTypeof = function(value) {
      if (Array.isArray(value && value.length > 0)) {
        return mechaPrimitiveTypeof(value[0]);
      } else {
        switch (typeof value) {
          case 'number':
            return 'float';
          default:
            return 'unknown';
        }
      }
    };
    Dispatcher = function() {};
    dispatch = new Dispatcher;
    Api = function(f) {
      return function() {
        var obj;
        obj = extend(Object.create(dispatch), f.apply(null, arguments));
        if ((typeof this !== "undefined" && this !== null) && this instanceof Dispatcher) {
          obj.nodes.unshift(this);
        }
        return obj;
      };
    };
    extend(dispatch, {
      union: Api(function() {
        var nodes;
        nodes = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
        return {
          type: 'union',
          nodes: nodes
        };
      }),
      intersect: Api(function() {
        var nodes;
        nodes = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
        return {
          type: 'intersect',
          nodes: nodes
        };
      }),
      difference: Api(function() {
        var nodes;
        nodes = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
        return {
          type: 'difference',
          nodes: nodes
        };
      }),
      box: Api(function() {
        var attr, nodes;
        attr = arguments[0], nodes = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
        return {
          type: 'box',
          attr: attr,
          nodes: nodes
        };
      }),
      cylinder: Api(function() {
        var attr, nodes;
        attr = arguments[0], nodes = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
        return {
          type: 'cylinder',
          attr: attr,
          nodes: nodes
        };
      }),
      sphere: Api(function() {
        var attr, nodes;
        attr = arguments[0], nodes = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
        return {
          type: 'sphere',
          attr: attr,
          nodes: nodes
        };
      }),
      mirror: Api(function() {
        var attr, nodes;
        attr = arguments[0], nodes = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
        return {
          type: 'mirror',
          attr: attr,
          nodes: nodes
        };
      }),
      translate: Api(function() {
        var attr, nodes;
        attr = arguments[0], nodes = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
        return {
          type: 'translate',
          attr: attr,
          nodes: nodes
        };
      }),
      rotate: Api(function() {
        var attr, nodes;
        attr = arguments[0], nodes = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
        return {
          type: 'rotate',
          attr: attr,
          nodes: nodes
        };
      }),
      scale: Api(function() {
        var attr, nodes;
        attr = arguments[0], nodes = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
        return {
          type: 'scale',
          attr: attr,
          nodes: nodes
        };
      }),
      material: Api(function() {
        var attr, nodes;
        attr = arguments[0], nodes = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
        return {
          type: 'material',
          attr: attr,
          nodes: nodes
        };
      }),
      chamfer: Api(function() {
        var attr, nodes;
        attr = arguments[0], nodes = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
        return {
          type: 'chamfer',
          attr: attr,
          nodes: nodes
        };
      }),
      bevel: Api(function() {
        var attr, nodes;
        attr = arguments[0], nodes = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
        return {
          type: 'bevel',
          attr: attr,
          nodes: nodes
        };
      }),
      wedge: Api(function() {
        var attr, nodes;
        attr = arguments[0], nodes = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
        return {
          type: 'wedge',
          attr: attr,
          nodes: nodes
        };
      })
    });
    window.scene = function() {
      var attr, nodes, serializeAttr, serializeNodes;
      attr = arguments[0], nodes = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
      serializeAttr = function(attr) {
        var i, key, val, _ref;
        if (attr instanceof MechaExpression) {
          return attr.serialize();
        } else if (Array.isArray(attr)) {
          for (i = 0, _ref = attr.length; 0 <= _ref ? i < _ref : i > _ref; 0 <= _ref ? i++ : i--) {
            attr[i] = serializeAttr(attr[i]);
          }
        } else if (typeof attr === 'object') {
          for (key in attr) {
            val = attr[key];
            attr[key] = serializeAttr(val);
          }
        }
        return attr;
      };
      serializeNodes = function(nodes) {
        var n, _i, _len, _results;
        _results = [];
        for (_i = 0, _len = nodes.length; _i < _len; _i++) {
          n = nodes[_i];
          _results.push({
            type: n.type,
            attr: serializeAttr(n.attr),
            nodes: serializeNodes(n.nodes)
          });
        }
        return _results;
      };
      return {
        type: 'scene',
        attr: attr,
        nodes: serializeNodes(nodes)
      };
    };
    extend(window, dispatch);
    globalParamIndex = 0;
    MechaParameter = (function() {

      function MechaParameter(attr) {
        this.attr = attr;
        this.str = "u" + attr.paramIndex;
        exportedParameters[this.str] = attr;
      }

      return MechaParameter;

    })();
    MechaExpression = (function() {

      function MechaExpression(param, str) {
        this.param = param;
        this.str = str != null ? str : new String(param.str);
      }

      MechaExpression.prototype.serialize = function() {
        return this.str;
      };

      MechaExpression.prototype.update = function(str) {
        return new MechaExpression(this.param, str);
      };

      MechaExpression.prototype.index = function(arg) {
        if (typeof arg === 'number' && (arg | 0) === arg) {
          return this.update("" + this.str + "[" + arg + "]");
        } else {
          throw "Argument to index must be an integer";
        }
      };

      MechaExpression.prototype.mul = function(arg) {
        if (this.attr.primitiveType === 'float' && typeof arg === 'number' && (arg | 0) === arg) {
          return this.update("(" + this.str + ") * " + arg + ".0");
        } else {
          return this.update("(" + this.str + ") * " + arg);
        }
      };

      MechaExpression.prototype.div = function(arg) {
        if (this.attr.primitiveType === 'float' && typeof arg === 'number' && (arg | 0) === arg) {
          return this.update("(" + this.str + ") / " + arg + ".0");
        } else {
          return this.update("(" + this.str + ") / " + arg);
        }
      };

      MechaExpression.prototype.add = function(arg) {
        if (this.attr.primitiveType === 'float' && typeof arg === 'number' && (arg | 0) === arg) {
          return this.update("(" + this.str + ") + " + arg + ".0");
        } else {
          return this.update("(" + this.str + ") + " + arg);
        }
      };

      MechaExpression.prototype.sub = function(arg) {
        if (this.attr.primitiveType === 'float' && typeof arg === 'number' && (arg | 0) === arg) {
          return this.update("(" + this.str + ") - " + arg + ".0");
        } else {
          return this.update("(" + this.str + ") - " + arg);
        }
      };

      return MechaExpression;

    })();
    window.range = function(description, defaultArg, start, end, step) {
      var paramIndex;
      paramIndex = globalParamIndex;
      ++globalParamIndex;
      return new MechaExpression(new MechaParameter({
        param: 'range',
        description: description,
        type: mechaTypeof(defaultArg),
        primitiveType: mechaPrimitiveTypeof(defaultArg),
        paramIndex: paramIndex,
        start: start,
        end: end,
        step: step,
        defaultArg: defaultArg
      }));
    };
    return window.number = function(description, defaultArg) {
      var paramIndex;
      paramIndex = globalParamIndex;
      ++globalParamIndex;
      return new MechaExpression(new MechaParameter({
        param: 'param',
        description: description,
        type: mechaTypeof(defaultArg),
        primitiveType: mechaPrimitiveTypeof(defaultArg),
        defaultArg: defaultArg
      }));
    };
  })();

  exports = exports != null ? exports : {};

  return exports;

}).call(this);
