/*
 * Copyright 2011, CircuitHub.com
 */
"use strict";

(function() {
  var __slice = Array.prototype.slice;
  (function() {
    var Api, dispatch, extend;
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
      var ff;
      ff = function(args) {
        return extend(this, f.apply(null, args));
      };
      f.prototype = ff.prototype = dispatch;
      return function() {
        var obj;
        obj = new ff(arguments);
        if (typeof this !== "undefined" && this !== null) {
          obj.nodes.unshift(this);
        }
        return obj;
      };
    };
    extend(dispatch, {
      union: Api(function() {
        var attr, nodes;
        attr = arguments[0], nodes = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
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
        if (attr.chamfer != null) {
          if (!(attr.chamfer.corners != null)) {
            attr.chamfer.corners = true;
          }
          node.chamfer.edges = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
        }
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
      translate: Api(function() {
        var attr, nodes;
        attr = arguments[0], nodes = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
        return {
          type: 'translate',
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
      })
    });
    window.scene = function() {
      var nodes, strip;
      nodes = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
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
        nodes: strip(nodes)
      };
    };
    return extend(window, dispatch);
  })();
}).call(this);
