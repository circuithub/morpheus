# Eventful code comes here
# Program state should not be manipulated outside events files

# Initialize the canvas element (size, aspect ratio etc)
canvasInit = () ->
  windowResize()

# Initialize nodes in the scene graph
sceneInit = () ->
  csmSourceCode = mecha.generator.translateCSM state.api.sourceCode, mecha.editor.getSourceCode()

  # Run the script inside a webworker sandbox
  requestId = JSandbox.eval 
    data: csmSourceCode
    callback: (result) ->
      ## TEMPORARY
      console.log result
      ##
      
      # Update the model parameters
      model = state.models['']
      if not model?
        model = state.models[''] = { shaders: [], params: {}, args: {} }
      model.params = result.attr.params
      # Initialize any model arguments to their default values when they are unassigned
      for name,attr of model.params
        if not model.args[name]?
          model.args[name] = attr.defaultArg
      # Generate shaders for the model
      model.shaders = mecha.generator.compileGLSL (mecha.generator.compileASM result), model.params
      # Update the model in the renderer
      mecha.renderer.modelShaders '', model.shaders
      mecha.renderer.modelArguments '', model.args
    onerror: (data,request) ->
      mecha.logInternalError "Error compiling the solid model."

# Initialize html controls for interacting with mecha
controlsInit = () ->
  

# Initialize the CSM API (by loading the code from the given url)
apiInit = (callback) ->
  # Get the API code
  state.api.url = ($ "link[rel='api']").attr 'href'
  ($.get (encodeURIComponent state.api.url), undefined, undefined, 'text')
    .success (data, textStatus, jqXHR) -> 
      state.api.sourceCode = data
      mecha.log "Loaded " + state.api.url
      callback() if callback?
    .error () -> 
      mecha.log "Error loading API script"

# Initialize the gui controls and register events once the rest of the document has completely loaded
init = (containerEl, canvasEl) ->
  state.viewport.domElement = containerEl
  state.canvas = canvasEl
  if state.canvas?
    state.scene = mecha.renderer.createScene state.canvas.getContext 'experimental-webgl'
    mecha.renderer.runScene state.canvas, (->)
  canvasInit()
  apiInit sceneInit
  controlsInit()
  registerDOMEvents()
  registerControlEvents()
  state.application.initialized = true

