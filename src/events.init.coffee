# Eventful code comes here
# Program state should not be manipulated outside events files

canvasInit = () ->
  windowResize()

sceneInit = () ->
  shaderDef =
    type: 'shader',
    id: 'main-shader',
    shaders: [
      stage: 'fragment',
      code: ""
    ]
    vars: {}
  (state.scene.findNode 'cube-transform').insert 'node', shaderDef

controlsInit = () ->
  

# Start rendering as soon as possible
canvasInit()
sceneInit()
state.scene.start
  idleFunc: sceneIdle

# Initialize the gui controls and register events once the rest of the document has completely loaded
$ () -> 
  controlsInit()
  registerDOMEvents()
  registerControlEvents()
  state.application.initialized = true

