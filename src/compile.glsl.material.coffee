# Compile the GLSL material search

glslMaterial =
  glslDistanceCompiler (
      (a,b,prelude) -> 
        # First memoize values and then generate a ternary if operation
        glslCompiler.preludePush prelude, (String a), 'float'
        memoA = glslCompiler.preludePop prelude
        glslCompiler.preludePush prelude, (String b), 'float'
        memoB = glslCompiler.preludePop prelude
        "#{memoA} < #{memoB}? #{memoA} : #{memoB}"
    ),
    (
      (a,b,prelude) -> 
        # First memoize values and then generate a ternary if operation
        glslCompiler.preludePush prelude, (String a), 'float'
        memoA = glslCompiler.preludePop prelude
        glslCompiler.preludePush prelude, (String b), 'float'
        memoB = glslCompiler.preludePop prelude
        "#{memoA} > #{memoB}? #{memoA} : #{memoB}"
    )
