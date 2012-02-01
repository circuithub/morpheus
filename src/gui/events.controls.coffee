# Eventful code comes here
# Program state should not be manipulated outside events files

controlsSourceCompile = safeExport 'mecha.gui.controlsSourceCompile', undefined, () ->
  # TODO: Look at this - do we need more fine-grained control (E.g. make sure re-initialization won't cause memory leaks)
  sceneInit()
  return

controlsParamChange = safeExport 'mecha.gui.controlsParamChange', undefined, (event) ->
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
  return
