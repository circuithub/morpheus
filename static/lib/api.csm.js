/*
 * Copyright 2011, CircuitHub.com
 */
"use strict";

(function() {
  var __slice = Array.prototype.slice;
  (function() {
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
        attr: attr,
        nodes: nodes
      };
    };
    window.chamfer = function() {
      var attr, node, nodes, _i, _len, _results;
      attr = arguments[0], nodes = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
      _results = [];
      for (_i = 0, _len = nodes.length; _i < _len; _i++) {
        node = nodes[_i];
        _results.push(node.attr.chamfer = attr);
      }
      return _results;
    };
    window.intersect = function() {
      var attr, nodes;
      attr = arguments[0], nodes = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
      return {
        type: 'intersect',
        attr: attr,
        nodes: nodes
      };
    };
    window.difference = function() {
      var attr, nodes;
      attr = arguments[0], nodes = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
      return {
        type: 'difference',
        attr: attr,
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
