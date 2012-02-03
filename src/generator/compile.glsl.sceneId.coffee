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
        # TODO: Test whether int or float is faster for storing the material id
        # TODO: The following might be faster, however it seems to be incorrectly translated by ANGLE on windows (or possibly some drivers?)
        #id = glslCompiler.preludeAdd flags.glslPrelude, '-1', 'int'
        #result = new toStringPrototype "#{memoA} < #{memoB}? ((#{id} = #{a.materialId}), #{memoA}) : ((#{id} = #{b.materialId}), #{memoB})"
        id = glslCompiler.preludeAdd flags.glslPrelude, "#{memoA} < #{memoB}? #{a.materialId} : #{b.materialId}", 'int'
        result = new toStringPrototype "#{memoA} < #{memoB}? #{memoA} : #{memoB}"
        result.materialId = id
        result
    ),
    (
      (a,b,flags) -> 
        # First memoize values and then generate a ternary if operation
        memoA = glslCompiler.preludeAdd flags.glslPrelude, (String a), 'float'
        memoB = glslCompiler.preludeAdd flags.glslPrelude, (String b), 'float'
        # TODO: Test whether int or float is faster for storing the material id
        # TODO: The following might be faster, however it seems to be incorrectly translated by ANGLE on windows (or possibly some drivers?)
        #id = glslCompiler.preludeAdd flags.glslPrelude, '-1', 'int'
        #result = new toStringPrototype "#{memoA} > #{memoB}? ((#{id} = #{a.materialId}), #{memoA}) : ((#{id} = #{b.materialId}), #{memoB})"
        id = glslCompiler.preludeAdd flags.glslPrelude, "#{memoA} > #{memoB}? #{a.materialId} : #{b.materialId}", 'int'
        result = new toStringPrototype "#{memoA} > #{memoB}? #{memoA} : #{memoB}"
        result.materialId = id
        result
    ),
    (
      (oldVal, newVal) -> 
        result = new toStringPrototype newVal
        result.materialId = oldVal.materialId
        result
    )

