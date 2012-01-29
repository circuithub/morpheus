# Create the DOM elements for the editor
getSourceCode = ->
  try
    # TODO: possibly avoid jQuery in the future
    return ($ '#mecha-source-code').val()
  catch error
    mecha.logInternalError "Exception occurred in `mecha.gui.createControls`:\n", error
    return ''
  
