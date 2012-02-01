# Eventful code comes here
# Program state should not be manipulated outside events files

sceneIdle = () ->
  return do safeTry "mecha.gui: sceneIdle", (->
      #SceneJS.FX.idle()
    ), ((error) -> 
      # We probably don't want to log error messages for the idle
    )
