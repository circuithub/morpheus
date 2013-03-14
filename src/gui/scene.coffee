# Initialize nodes in the scene graph
sceneScript = safeExport 'morpheus.gui: sceneScript', undefined, (morpheusScriptCode, callback) ->
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

      # Helper to get the id of a wrapped parameter
      unwrap = (data) -> switch data._tag
        when 'tolerance', 'range' then data[0] # unwrap tolerance/range tags
        else data
      # Reset any model arguments to their default values when their definitions change
      for uniformID,oldParam of model.params
        param = params[uniformID]
        if not param? or param._tag != oldParam._tag
          [id,meta,defaultValue] = unwrap (param ? oldParam)
          delete model.args[id]
      # Initialize unassigned model arguments
      for uniformID,param of params
        [id,meta,defaultValue] = unwrap param
        if not (id in model.args)
          # New parameter supplied, use the default argument
          model.args[id] = defaultValue
      model.params = params
      # Generate shaders for the model
      model.shaders = morpheus.generator.compileGLSL (morpheus.generator.compileASM result), model.params
      morpheus.logDebug model.shaders[1] ## TEMPORARY
      # Update the model in the renderer
      morpheus.renderer.modelShaders 'scene', model.shaders
      morpheus.renderer.modelArguments 'scene', model.args, model.params
      controlsInit()
      state.application.sceneInitialized = true
      callback?()
      return
    onerror: (data, request) ->
      morpheus.logInternalError "Error compiling the solid model."
      #state.application.sceneInitialized = false
      callback? "Error compiling the solid model."
      return
  return

# Reset all arguments in the scene (used when loading a completely new script)
sceneReset = safeExport 'morpheus.gui: sceneReset', undefined, () ->
  state.models['scene'] = { shaders: [], params: {}, args: {} }

