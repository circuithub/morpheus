# Generate a function to calculate the closest scene distance from certain point in space
glslSceneDistance = 
  glslCompilerDistance (
      (a,b) -> "min(#{a}, #{b})"
    ), 
    (
      (a,b) -> "max(#{a}, #{b})"
    )

