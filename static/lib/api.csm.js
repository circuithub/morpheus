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
