modelShaders = safeExport 'morpheus.renderer.modelShaders', false, (modelName, shaders) ->
  success = true

  # Check whether the webgl context is available    
  if not state.context?
    throw "WebGL context is not available."

  if not shaders? or shaders.length < 2 or shaders[0].length == 0 or shaders[1].length == 0
    return

  # Create the shader program
  if not state.shader.program?
    state.shader.program = state.context.createProgram()
    state.shader.vs = state.context.createShader state.context.VERTEX_SHADER
    state.context.attachShader state.shader.program, state.shader.vs
    state.shader.fs = state.context.createShader state.context.FRAGMENT_SHADER
    state.context.attachShader state.shader.program, state.shader.fs

  # Compile the shaders
  state.context.shaderSource state.shader.vs, shaders[0]
  state.context.shaderSource state.shader.fs, shaders[1]
  state.context.compileShader state.shader.vs
  if not state.context.getShaderParameter state.shader.vs, state.context.COMPILE_STATUS
    morpheus.logApiError "Shader compile failed:\n#{state.context.getShaderInfoLog state.shader.vs}\n#{shaders[0]}"
  state.context.compileShader state.shader.fs
  if not state.context.getShaderParameter state.shader.fs, state.context.COMPILE_STATUS
    morpheus.logApiError "Shader compile failed:\n#{state.context.getShaderInfoLog state.shader.fs}\n#{shaders[1]}"
  state.context.linkProgram state.shader.program
  if not state.context.getProgramParameter state.shader.program, state.context.LINK_STATUS
    morpheus.logApiError "Shader link failed:\n#{state.context.getProgramInfoLog state.shader.progam}"
  (gl 'scene').shaderProgram state.shader.program
  gl.refresh state.shader.program
  return success

modelArguments = safeExport 'morpheus.renderer.modelArguments', undefined, (modelName, args, params) ->  
  # Helper to get the id of a wrapped parameter
  unwrap = (data) -> switch data._tag
    when 'tolerance', 'range' then data[0] # unwrap tolerance/range tags
    else data

  # Build a map from script ids to parameter ids
  paramToUniform = {}
  if params? then for uniformID,param of params
    [id] = unwrap param
    paramToUniform[id] = uniformID

  # Assign arguments to webgl uniforms
  for id,arg of args
    uniformID = paramToUniform[id] ? id
    # If the argument is a toleranced type then calculate nominal as the average of min and max
    if (not Array.isArray arg) and (typeof arg == 'object') and arg.min? and arg.max?
      nom = null
      if Array.isArray arg.min
        nom = ((x + arg.max[i]) * 0.5 for x,i in arg.min)
      else
        nom = (arg.min + arg.max) * 0.5
      (gl modelName).uniform uniformID, nom
    else
      (gl modelName).uniform uniformID, arg
  return

modelRotate = safeExport 'morpheus.renderer.modelRotate', undefined, (modelName, angles) ->
  gl.matrix3.rotateZY state.rotation, state.rotation, angles
  (gl modelName).uniform 'model', state.rotation
  return

