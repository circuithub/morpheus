# Additional math constants / routines not found in standard JavaScript or SceneJS

# Mathematical constants
math_sqrt2 = Math.sqrt 2.0
math_invsqrt2 = 1.0 / math_sqrt2
math_degToRad = Math.PI / 180.0
math_radToDeg = 180.0 / Math.PI

# Math routines
Math.clamp = (s, min, max) ->
  Math.min(Math.max(s, min), max)

