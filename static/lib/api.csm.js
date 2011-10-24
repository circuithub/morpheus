/*
 * Copyright header comes here
 */
"use strict";

(function() {
  var __slice = Array.prototype.slice;
  (function() {
    var _csmModel;
    _csmModel = {};
    return {
      union: function() {
        var attr, nodes;
        attr = arguments[0], nodes = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
        return {
          type: 'union',
          attr: attr,
          nodes: nodes
        };
      },
      intersect: function() {
        var attr, nodes;
        attr = arguments[0], nodes = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
        return {
          type: 'intersect',
          attr: attr,
          nodes: nodes
        };
      },
      difference: function() {
        var attr, nodes;
        attr = arguments[0], nodes = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
        return {
          type: 'difference',
          attr: attr,
          nodes: nodes
        };
      },
      box: function() {
        var attr, nodes;
        attr = arguments[0], nodes = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
        return {
          type: 'box',
          attr: attr,
          nodes: nodes
        };
      },
      cylinder: function() {
        var attr, nodes;
        attr = arguments[0], nodes = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
        return {
          type: 'cylinder',
          attr: attr,
          nodes: nodes
        };
      },
      sphere: function() {
        var attr, nodes;
        attr = arguments[0], nodes = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
        return {
          type: 'sphere',
          attr: attr,
          nodes: nodes
        };
      },
      getModel: function() {
        var clone;
        clone = function() {
          var key, temp, _i, _len;
          if (obj === null || typeof obj !== 'object') {
            return obj;
          }
          temp = new obj.constructor();
          for (_i = 0, _len = obj.length; _i < _len; _i++) {
            key = obj[_i];
            temp[key] = clone(obj[key]);
          }
          return temp;
        };
        return clone(_csmModel);
      }
    };
  })();
}).call(this);
