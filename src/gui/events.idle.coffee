# Eventful code comes here
# Program state should not be manipulated outside events files

sceneIdle = () ->
  try
    #SceneJS.FX.idle()
  catch error
    mecha.logInternalError "Exception occurred in `mecha.gui.sceneIdle`:\n", error
  return
