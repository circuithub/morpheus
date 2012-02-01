# Eventful code comes here
# Program state should not be manipulated outside events files

controlsSourceCompile = safeExport 'mecha.gui.controlsSourceCompile', undefined, () ->
  #try
  # TODO: This is only temporary to avoid Chrome's debugger crashing and the shader loading improved
  sceneInit()
  #try
  #  # TODO: SceneJS does not yet support updating the shader like this
  #  compileCSM ($ '#source-code').val(), 
  #    (result) ->
  #      #console.log compileGLSL compileASM result
  #      (state.scene.findNode 'main-shader').set 'shaders', [
  #          stage: 'fragment',
  #          code: compileGLSL compileASM result
  #        ]
  #catch error
  #  mecha.log error
  #catch error
  #  mecha.logInternalError "Exception occurred in `mecha.gui.controlsSourceCompile`:\n", error
  return

controlsParamChange = safeExport 'mecha.gui.controlsParamChange', undefined, (event) ->
  #try
  splitElName = event.target.name.split '[', 2
  paramName = splitElName[0]
  paramIndex = if splitElName.length > 1 then (Number (splitElName[1].split ']', 2)[0]) else 0
  model = state.models['scene']
  if model.params[paramName]?
    switch model.params[paramName].type
      when 'float'
        model.args[paramName] = Number ($ event.target).val()
      when 'vec2', 'vec3', 'vec4'
        model.args[paramName][paramIndex] = Number ($ event.target).val()
      else
        mecha.logInternalError "Unknown type `#{model.params[paramName].type}` for parameter `#{paramName}` during change event."
  mecha.renderer.modelArguments 'scene', model.args
  #catch error
  #  mecha.logInternalError "Exception occurred in `mecha.gui.controlsParamChange`:\n", error
  return
