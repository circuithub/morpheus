# Eventful code comes here
# Program state should not be manipulated outside events files

windowResize = safeExport 'mecha.gui: windowResize', undefined, -> 
  #try
  # Reconfigure the camera
  #cameraNode = (state.scene.findNode 'main-camera')
  #cameraOptics = cameraNode.get 'optics'
  #cameraOptics.aspect = state.canvas.width / state.canvas.height
  #cameraNode.set 'optics', cameraOptics
  #catch error
  #  mecha.logInternalError "Exception occurred in `mecha.gui.windowResize`:\n", error
  return
