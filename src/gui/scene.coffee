# Initialize nodes in the scene graph
sceneScript = safeExport 'morpheus.gui: sceneScript', undefined, (morpheusScriptCode) ->
  csmSourceCode = morpheus.generator.translateCSM state.api.sourceCode, morpheusScriptCode

  # Run the script inside a webworker sandbox
  requestId = JSandbox.eval 
    data: csmSourceCode
    callback: (result) ->
      morpheus.logDebug result ## TEMPORARY
      
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
            # Argument is unassigned or the parameter has changed, use the default argument
            model.args[name] = attr.defaultArg
      for name,attr of params
        if not (name in model.args)
          # New parameter supplied, use the default argument
          model.args[name] = attr.defaultArg
      model.params = params
      # Generate shaders for the model
      model.shaders = morpheus.generator.compileGLSL (morpheus.generator.compileASM result), model.params
      morpheus.logDebug model.shaders[1] ## TEMPORARY
      # Update the model in the renderer
      morpheus.renderer.modelShaders 'scene', model.shaders
      morpheus.renderer.modelArguments 'scene', model.args
      controlsInit()
      state.application.sceneInitialized = true
    onerror: (data,request) ->
      morpheus.logInternalError "Error compiling the solid model."
      #state.application.sceneInitialized = false
  return

# Reset all arguments in the scene (used when loading a completely new script)
sceneReset = safeExport 'morpheus.gui: sceneReset', undefined, () ->
  state.models['scene'] = { shaders: [], params: {}, args: {} }

