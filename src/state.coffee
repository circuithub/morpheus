# The program state
# No global state is allowed to exist outside of this structure

state =
  scene: SceneJS.scene 'Scene'
  canvas: document.getElementById 'scenejsCanvas'
  viewport: 
    domElement: document.getElementById 'viewport'
    mouse:
      last: [0, 0]
      leftDragging: false
      middleDragging: false
  application:
    initialized: false

