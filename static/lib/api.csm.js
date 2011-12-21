/*
 * Copyright 2011, CircuitHub.com
 */
(function() {
  var __slice = Array.prototype.slice;

  (function() {
    var Api, Parameter, dispatch, extend, globalParamIndex;
    extend = function(obj, mixin) {
      var method, name;
      for (name in mixin) {
        method = mixin[name];
        obj[name] = method;
      }
      return obj;
    };
    dispatch = {};
    Api = function(f) {
      return function() {
        var obj;
        obj = extend(Object.create(dispatch), f.apply(null, arguments));
        if (typeof this !== "undefined" && this !== null) obj.nodes.unshift(this);
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
      var attr, nodes, strip;
      attr = arguments[0], nodes = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
      strip = function(nodes) {
        var n, _i, _len, _results;
        _results = [];
        for (_i = 0, _len = nodes.length; _i < _len; _i++) {
          n = nodes[_i];
          _results.push({
            type: n.type,
            attr: n.attr,
            nodes: strip(n.nodes)
          });
        }
        return _results;
      };
      return {
        type: 'scene',
        attr: attr,
        nodes: strip(nodes)
      };
    };
    extend(window, dispatch);
    globalParamIndex = 0;
    Parameter = (function() {

      function Parameter(attr) {
        this.attr = attr;
        this.str = "u" + attr.paramIndex;
        exportedParameters.push(attr.description);
      }

      Parameter.prototype.toString = function() {
        return this.str;
      };

      Parameter.prototype.index = function(arg) {
        if (typeof arg === 'number' && (arg | 0) === arg) {
          this.str = "" + this.str + "[" + arg + "]";
        } else {
          throw "Argument to index must be an integer";
        }
        return this;
      };

      Parameter.prototype.mul = function(arg) {
        if (this.attr.type === 'float' && typeof arg === 'number' && (arg | 0) === arg) {
          this.str = "(" + this.str + ") * " + arg + ".0";
        } else {
          this.str = "(" + this.str + ") * " + arg;
        }
        return this;
      };

      Parameter.prototype.div = function(arg) {
        if (this.attr.type === 'float' && typeof arg === 'number' && (arg | 0) === arg) {
          this.str = "(" + this.str + ") / " + arg + ".0";
        } else {
          this.str = "(" + this.str + ") / " + arg;
        }
        return this;
      };

      Parameter.prototype.add = function(arg) {
        if (this.attr.type === 'float' && typeof arg === 'number' && (arg | 0) === arg) {
          this.str = "(" + this.str + ") + " + arg + ".0";
        } else {
          this.str = "(" + this.str + ") + " + arg;
        }
        return this;
      };

      Parameter.prototype.sub = function(arg) {
        if (this.attr.type === 'float' && typeof arg === 'number' && (arg | 0) === arg) {
          this.str = "(" + this.str + ") - " + arg + ".0";
        } else {
          this.str = "(" + this.str + ") - " + arg;
        }
        return this;
      };

      return Parameter;

    })();
    window.range = function(description, defaultArg, start, end, step) {
      var paramIndex;
      paramIndex = globalParamIndex;
      ++globalParamIndex;
      return new Parameter({
        param: 'range',
        description: description,
        type: 'float',
        paramIndex: paramIndex,
        start: start,
        end: end,
        step: step,
        defaultArg: defaultArg
      });
    };
    return window.number = function(description, defaultArg) {
      return {
        param: 'param',
        description: description,
        type: 'float',
        defaultArg: defaultArg
      };
    };
  })();

}).call(this);
