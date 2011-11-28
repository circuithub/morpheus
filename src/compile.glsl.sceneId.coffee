# Generate a function to calculate the scene id at a certain point in space
glslSceneId =
  glslCompilerDistance (
      (a,b,prelude) -> 
        # First memoize values and then generate a ternary if operation
        glslCompiler.preludePush prelude, (String a), 'float'
        memoA = glslCompiler.preludePop prelude
        glslCompiler.preludePush prelude, (String b), 'float'
        memoB = glslCompiler.preludePop prelude
        "#{memoA} < #{memoB}? (id = 1, #{memoA}) : (id = 2, #{memoB})"
    ),
    (
      (a,b,prelude) -> 
        # First memoize values and then generate a ternary if operation
        glslCompiler.preludePush prelude, (String a), 'float'
        memoA = glslCompiler.preludePop prelude
        glslCompiler.preludePush prelude, (String b), 'float'
        memoB = glslCompiler.preludePop prelude
        "#{memoA} > #{memoB}? (id = 3, #{memoA}) : (id = 4, #{memoB})"
    )
