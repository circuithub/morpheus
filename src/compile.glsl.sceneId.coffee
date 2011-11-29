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
        glslCompiler.preludePush flags.glslPrelude, (String a), 'float'
        memoA = glslCompiler.preludePop flags.glslPrelude
        glslCompiler.preludePush flags.glslPrelude, (String b), 'float'
        memoB = glslCompiler.preludePop flags.glslPrelude
        result = new toStringPrototype "#{memoA} < #{memoB}? (id = #{a.materialId}, #{memoA}) : (id = #{b.materialId}, #{memoB})"
        result.materialId = flags.materialIdStack[flags.materialIdStack.length - 1]
        result
    ),
    (
      (a,b,flags) -> 
        # First memoize values and then generate a ternary if operation
        glslCompiler.preludePush flags.glslPrelude, (String a), 'float'
        memoA = glslCompiler.preludePop flags.glslPrelude
        glslCompiler.preludePush flags.glslPrelude, (String b), 'float'
        memoB = glslCompiler.preludePop flags.glslPrelude
        result = new toStringPrototype "#{memoA} > #{memoB}? (id = #{a.materialId}, #{memoA}) : (id = #{b.materialId}, #{memoB})"
        result.materialId = flags.materialIdStack[flags.materialIdStack.length - 1]
        result
    )
