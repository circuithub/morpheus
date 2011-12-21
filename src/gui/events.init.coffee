# Eventful code comes here
# Program state should not be manipulated outside events files

# Initialize the canvas element (size, aspect ratio etc)
canvasInit = () ->
  windowResize()

# Initialize nodes in the scene graph
sceneInit = () ->
  compileCSM ($ '#source-code').val(), 
    (result) ->
      shaders = compileGLSL compileASM result
      shaderDef =
        type: 'shader',
        id: 'main-shader',
        shaders: [
        #  stage: 'vertex',
        #  code: shaders[0]
        #,
          stage: 'fragment',
          code: shaders[1]
        ]
        vars: {}
      (state.scene.findNode 'cube-mat').insert 'node', shaderDef

# Initialize html controls for interacting with mecha
controlsInit = () ->
  

# Initialize the CSM API (by loading the code from the given url)
apiInit = () ->
  # Get the API code
  state.api.url = ($ "link[rel='api']").attr 'href'
  ($.get encodeURIComponent state.api.url, undefined, undefined, 'text')
    .success (data, textStatus, jqXHR) -> 
      state.api.sourceCode = data
      mecha.log "Loaded " + state.api.url
      #TODO: This should probably be called elsewhere in the future!
      #TODO: In fact: it causes chrome's debugger to crash
      #sceneInit()
    .error () -> 
      mecha.log "Error loading API script"

# Start rendering as soon as possible
canvasInit()
#TODO: sceneInit()
state.scene.start
  idleFunc: sceneIdle

# Initialize the gui controls and register events once the rest of the document has completely loaded
$ () -> 
  apiInit()
  controlsInit()
  registerDOMEvents()
  registerControlEvents()
  state.application.initialized = true

