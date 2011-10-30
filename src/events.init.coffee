# Eventful code comes here
# Program state should not be manipulated outside events files

# Initialize the canvas element (size, aspect ratio etc)
canvasInit = () ->
  windowResize()

# Initialize nodes in the scene graph
sceneInit = () ->
  shaderDef =
    type: 'shader',
    id: 'main-shader',
    shaders: [
      stage: 'fragment',
      code: compileGLSL compileASM { type: 'scene', nodes: [] }
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
    .error () -> 
      mecha.log "Error loading API script"

# Start rendering as soon as possible
canvasInit()
sceneInit()
state.scene.start
  idleFunc: sceneIdle

# Initialize the gui controls and register events once the rest of the document has completely loaded
$ () -> 
  apiInit()
  controlsInit()
  registerDOMEvents()
  registerControlEvents()
  state.application.initialized = true

