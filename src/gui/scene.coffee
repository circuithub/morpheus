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
      # Reset any model arguments to their default values when their definitions change
      for name,oldAttr of model.params
        attr = params[name]          
        if not attr? or attr._tag != oldAttr._tag
          delete model.args[name]
      # Initialize unassigned model arguments
      for name,attr of params
        if not (name in model.args)
          # New parameter supplied, use the default argument
          [id,meta,defaultValue] = attr
          model.args[name] = defaultValue # TODO: handle tolerance value here?
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

