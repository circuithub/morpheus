# Generate a function to calculate the scene id at a certain point in space
glslSceneId =
  glslCompilerDistance (
      (a,flags) -> 
        result = new toStringPrototype a
        result.materialId = flags.materialIdStack[flags.materialIdStack.length - 1]
        result
    ),
    (
      (a,b,flags) -> 
        # First memoize values and then generate a ternary if operation
        memoA = glslCompiler.preludeAdd flags.glslPrelude, (String a), 'float'
        memoB = glslCompiler.preludeAdd flags.glslPrelude, (String b), 'float'
        id = glslCompiler.preludeAdd flags.glslPrelude, '-1', 'int'
        result = new toStringPrototype "#{memoA} < #{memoB}? (#{id} = #{a.materialId}, #{memoA}) : (#{id} = #{b.materialId}, #{memoB})"
        result.materialId = id
        result
    ),
    (
      (a,b,flags) -> 
        # First memoize values and then generate a ternary if operation
        memoA = glslCompiler.preludeAdd flags.glslPrelude, (String a), 'float'
        memoB = glslCompiler.preludeAdd flags.glslPrelude, (String b), 'float'
        id = glslCompiler.preludeAdd flags.glslPrelude, '-1', 'int'
        result = new toStringPrototype "#{memoA} > #{memoB}? (#{id} = #{a.materialId}, #{memoA}) : (#{id} = #{b.materialId}, #{memoB})"
        result.materialId = id
        result
    )
