# Eventful code comes here
# Program state should not be manipulated outside events files

controlsSourceCompile = safeExport 'morpheus.gui.controlsSourceCompile', undefined, () ->
  # TODO: Test
  console.log "TESTING SOURCE COMPILE"
  morpheus.gui.sceneReset() # TODO: remove?
  morpheus.gui.sceneScript script, (error) -> console.error error
  return

controlsArgumentsUpdate = safeExport 'morpheus.gui.controlsArgumentsUpdate', undefined, (event)  ->
  setModelArguments 'scene', parameterize.get state.parameters.domElement, getModelParameters 'scene'
  return
