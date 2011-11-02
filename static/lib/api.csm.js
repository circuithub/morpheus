/*
 * Copyright 2011, CircuitHub.com
 */
"use strict";

(function() {
  var __slice = Array.prototype.slice;
  (function() {
    var Chamferable, IntersectNode, extend;
    extend = function(obj, mixin) {
      var method, name, _results;
      _results = [];
      for (name in mixin) {
        method = mixin[name];
        _results.push(obj[name] = method);
      }
      return _results;
    };
    Chamferable = (function() {
      function Chamferable() {}
      Chamferable.prototype.chamfer = function(amount) {
        return {
          type: 'chamfer',
          attr: {
            amount: amount
          },
          nodes: [this]
        };
      };
      return Chamferable;
    })();
    IntersectNode = (function() {
      function IntersectNode(nodes) {
        this.nodes = nodes;
        this.type = 'intersect';
      }
      return IntersectNode;
    })();
    extend(IntersectNode.prototype, Chamferable);
    window.scene = function() {
      var nodes;
      nodes = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
      return {
        type: 'scene',
        nodes: nodes
      };
    };
    window.union = function() {
      var attr, nodes;
      attr = arguments[0], nodes = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
      return {
        type: 'union',
        nodes: nodes
      };
    };
    window.intersect = function() {
      var nodes;
      nodes = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
      return new IntersectNode(nodes);
    };
    window.difference = function() {
      var nodes;
      nodes = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
      return {
        type: 'difference',
        nodes: nodes
      };
    };
    window.box = function() {
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
    };
    window.cylinder = function() {
      var attr, nodes;
      attr = arguments[0], nodes = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
      return {
        type: 'cylinder',
        attr: attr,
        nodes: nodes
      };
    };
    return window.sphere = function() {
      var attr, nodes;
      attr = arguments[0], nodes = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
      return {
        type: 'sphere',
        attr: attr,
        nodes: nodes
      };
    };
  })();
}).call(this);
