# An extensible glsl compiler function (can be specialized to compile various functions)
glslCompiler = (abstractSolidModel, preDispatch, postDispatch) ->
  if not abstractSolidModel?
    return
  rayOrigin = 'ro'
  flags =
    invert: false
    glslFunctions: {}
    glslPrelude: [['ro', "#{rayOrigin}"]]
    materials: []
    materialIdStack: [-1]
    composition: [glslCompiler.COMPOSITION_UNION]
  flags.glslPrelude.code = ""
  flags.glslPrelude.counter = 0

  result = mapASM preDispatch, postDispatch, [{nodes: []}], abstractSolidModel, flags
  result.flags = flags
  return result

# Useful enums
glslCompiler.COMPOSITION_UNION = 0
glslCompiler.COMPOSITION_INTERSECT = 1

# Add a variable to the prelude
# * valueType is optional
glslCompiler.preludePush = (prelude, value, valueType) ->
  name = 'r' + prelude.counter
  prelude.counter += 1
  prelude.code += "  #{if valueType? then valueType else 'vec3'} #{name} = #{value};\n"
  prelude.push [name, value]
  return name

# Remove a variable from the prelude stack (but not its compiled code)
glslCompiler.preludePop = (prelude) ->
  return prelude.pop()[0]

# Get the top variable name in the prelude (with safety checks)
glslCompiler.preludeTop = (prelude) ->
  if not Array.isArray prelude or prelude.length == 0
    throw "Could not retrieve top value from prelude."
  return prelude[prelude.length - 1][0]

# Add a value to the prelude without pushing it onto the stack
glslCompiler.preludeAdd = (prelude, value, valueType) ->
  name = 'r' + prelude.counter
  prelude.counter += 1
  prelude.code += "  #{if valueType? then valueType else 'vec3'} #{name} = #{value};\n"
  return name

