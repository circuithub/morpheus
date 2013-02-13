# Eventful code comes here
# Program state should not be manipulated outside events files

windowResize = safeExport 'morpheus.gui: windowResize', undefined, -> 
  # Reconfigure the camera
  #cameraNode = (state.scene.findNode 'main-camera')
  #cameraOptics = cameraNode.get 'optics'
  #cameraOptics.aspect = state.canvas.width / state.canvas.height
  #cameraNode.set 'optics', cameraOptics
  return
