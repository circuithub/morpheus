# Additional math routines not found in standard JavaScript or SceneJS

#Array.prototype.flatten = (a) ->
#	a.reduce ((xs, x) -> xs.concat flatten x if Array.isArray x else xs.concat [x]), []

Array.prototype.flatten = () ->
  [].concat ((if Array.isArray x then flatten x else [x]) for x in this)...

#Array.prototype.flatten = (xs) ->
#  (x... if Array.isArray x else x) for x in xs

