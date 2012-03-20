# Initialize nodes in the scene graph
sceneScript = safeExport 'mecha.gui: sceneScript', undefined, (mechaScriptCode) ->
  csmSourceCode = mecha.generator.translateCSM state.api.sourceCode, mechaScriptCode

  # Run the script inside a webworker sandbox
  requestId = JSandbox.eval 
    data: csmSourceCode
    callback: (result) ->
      mecha.logDebug result ## TEMPORARY
      
      # Update the model parameters
      model = state.models['scene']
      if not model?
        model = state.models['scene'] = { shaders: [], params: {}, args: {} }
      params = result?.attr?.params ? {}
      # Initialize any model arguments to their default values when they are unassigned or when their definitions change
      for name,attr of model.params
        if not (name in params)
          delete model.args[name]
        else 
          oldAttr = model.params[name]
          if not model.args[name]? or 
              attr.param != oldAttr.param or
              attr.primitiveType != oldAttr.primitiveType or
              attr.type != oldAttr.type or
              ((not Array.isArray attr.defaultArg) and attr.defaultArg != oldAttr.defaultArg)
            # Argument is unassigned or the parameter has changed
            model.args[name] = attr.defaultArg
      model.params = params
      # Generate shaders for the model
      model.shaders = mecha.generator.compileGLSL (mecha.generator.compileASM result), model.params
      mecha.logDebug model.shaders[1] ## TEMPORARY
      # Update the model in the renderer
      mecha.renderer.modelShaders 'scene', model.shaders
      mecha.renderer.modelArguments 'scene', model.args
      controlsInit()
      state.application.sceneInitialized = true
    onerror: (data,request) ->
      mecha.logInternalError "Error compiling the solid model."
      #state.application.sceneInitialized = false
  return

sceneReset = safeExport 'mecha.gui: sceneReset', undefined, () ->
  state.models['scene'] = { shaders: [], params: {}, args: {} }

