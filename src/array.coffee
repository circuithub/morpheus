# Additional math routines not found in standard JavaScript or SceneJS

#Array.prototype.flatten = (a) ->
#	a.reduce ((xs, x) -> xs.concat flatten x if Array.isArray x else xs.concat [x]), []

Array.prototype.flatten = (xs) ->
  [].concat ((flatten x if Array.isArray x else [x]) for x in xs)...

#Array.prototype.flatten = (xs) ->
#  (x... if Array.isArray x else x) for x in xs

