# Additional array routines not found in standard JavaScript

flatten = (array) ->
  [].concat ((if Array.isArray a then (flatten a) else [a]) for a in array)...

shallowClone = (array) ->
  array.slice 0
