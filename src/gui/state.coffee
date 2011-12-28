# The program state
# No global state is allowed to exist outside of this structure

state =
  scene: SceneJS.scene 'Scene'
  canvas: document.getElementById 'scenejsCanvas'
  viewport: 
    domElement: document.getElementById 'viewport'
    mouse:
      last: [0, 0]
      leftDown: false
      middleDown: false
      leftDragDistance: 0
      middleDragDistance: 0
  api:
    url: null
    sourceCode: null
  application:
    initialized: false
