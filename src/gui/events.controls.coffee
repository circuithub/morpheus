# Eventful code comes here
# Program state should not be manipulated outside events files

controlsSourceCompile = safeExport 'morpheus.gui.controlsSourceCompile', undefined, () ->
  #morpheus.gui.sceneReset() # TODO: remove?  
  morpheus.gui.sceneScript (morpheus.editor.getSourceCode state.editor.domElement), (error) -> if error? then console.error error ; return
  return

controlsArgumentsUpdate = safeExport 'morpheus.gui.controlsArgumentsUpdate', undefined, (event)  ->
  setModelArguments 'scene', parameterize.get state.parameters.domElement, getModelParameters 'scene'
  return
