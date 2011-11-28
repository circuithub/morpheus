# An extensible glsl compiler function (can be specialized to compile various functions)
glslCompiler = (abstractSolidModel, preDispatch, postDispatch) ->
  rayOrigin = 'ro'
  flags =
    invert: false
    glslFunctions: {}
    glslPrelude: [['ro', "#{rayOrigin}"]]
  flags.glslPrelude.code = ""
  flags.glslPrelude.counter = 0

  result = mapASM preDispatch, postDispatch, [{nodes: []}], abstractSolidModel, flags
  result.flags = flags
  return result

glslCompiler.preludePush = (prelude, value) ->
  name = 'r' + prelude.counter
  prelude.push [name, value]
  prelude.counter += 1
  prelude.code += "  vec3 #{name} = #{value};\n"
  return name

glslCompiler.preludePop = (prelude) ->
  return prelude.pop()[0]

