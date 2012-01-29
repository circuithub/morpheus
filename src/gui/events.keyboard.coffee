# Eventful code comes here
# Program state should not be manipulated outside events files

keyDown = (event) ->
  try
    #switch event.which
    #  when 0
  catch error
    mecha.logInternalError "Exception occurred in `mecha.gui.keyDown`:\n", error
  return
      
