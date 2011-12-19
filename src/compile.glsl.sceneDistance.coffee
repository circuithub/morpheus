# Generate a function to calculate the closest scene distance from certain point in space
glslSceneDistance = 
  glslCompilerDistance (
      (a) -> a
    ),
    (
      (a,b) -> "min(#{a}, #{b})"
    ), 
    (
      (a,b) -> "max(#{a}, #{b})"
    ),
    (
      (oldVal, newVal) -> newVal
    )

