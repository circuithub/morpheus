/*
 * adt-html.js - Algebraic Data Types for JavaScript
 * adt-html.js is free, public domain software (http://creativecommons.org/publicdomain/zero/1.0/)
 * Originally created by Rehno Lindeque of http://www.mischievousmeerkat.com
 * Use it in combination with https://github.com/rehno-lindeque/adt.js
 */
var adt = adt || (typeof require === 'function'? require('adt.js') : {}), 
html = (function() {
"use strict";
  // Using the html5 list of tags from (http://joshduck.com/periodic-table.html)
  // Other html api's should probably be in separate libraries? (xhtml, html4 etc)
  var
    _cons = adt(
      // Root element
      'html', 
      // Metadata and scripting
      'head','title','meta','base','link','style','noscript','script',
      // Text-level semantics
      'span','a','rt','rp','dfn','abbr','q','cite','em','time','var','samp','i',
      'b','sub','sup','small','strong','mark','ruby','ins','del','bdi','bdo',
      's','kbd','wbr','code',
      // Grouping content
      'br','hr','figcaption','figure','p','ol','ul','li','div','pre',
      'blockquote','dl','dt','dd',
      // Forms
      'fieldset','meter','legend','label','input','textarea','form','select',
      'optgroup','option','output','button','datalist','keygen','progress',
      // Document sections
      'body','aside','address','h1','h2','h3','h4','h5','h6','section','header',
      'nav','article','footer','hgroup',
      // Tabular data
      'col','colgroup','caption','table','tr','td','th','tbody','thead','tfoot',
      // Interactive elements
      'menu','command','summary','details',
      // Embedding content
      'img','area','map','embed','object','param','source','iframe','canvas',
      'track','audio','video'
    ),
    _eval = adt({ _: function(attributes) {
        var el = document.createElement(this._tag);
        for (var i = 0; i < arguments.length; ++i)
          // Check if the argument is a DOM node
          if (arguments[i].nodeType)
            el.appendChild(arguments[i]);
          else if (typeof arguments[i] === 'string')
            el.appendChild(document.createTextNode(arguments[i]));
        if (typeof attributes === 'object' && typeof attributes.nodeType === 'undefined') {
          for (var key in attributes)
            el.setAttribute(key, attributes[key]);
        }
        return el;
      }
    }),
    html = (typeof adt.compose === 'undefined')?
      function(){ throw "`adt.compose()` is needed in order to use html as a function."; }
      : adt.compose(_eval, _cons);
    html.cons = _cons;
    html.eval = _eval;
  // Export html to a CommonJS module if exports is available
  if (typeof module !== "undefined" && module !== null)
    module.exports = html;
  return html;
})();
