# Eventful code comes here
# Program state should not be manipulated outside events files

mouseDown = (event) ->
  switch event.which
    when 1 then state.viewport.mouse.leftDragging = true

mouseUp = (event) ->
  state.viewport.mouse.leftDragging = false
  #if event.which == 1 # Left mouse button
  #  coords = mouseCoordsWithinElement event
  #  pickRecord = state.scene.pick coords[0], coords[1]

mouseMove = (event) ->
  # TODO: Get an accurate time measurement since the last mouseMove event
  if state.viewport.mouse.leftDragging
    # Get the delta position of the mouse over this frame
    delta = [event.clientX - state.viewport.mouse.last[0], event.clientY - state.viewport.mouse.last[1]]
    deltaLength = SceneJS_math_lenVec2 delta

    # Calculate the orbit angle to apply to the lookAt
    orbitAngles = [0.0,0.0]
    SceneJS_math_mulVec2Scalar delta, constants.camera.orbitSpeedFactor / deltaLength, orbitAngles
    orbitAngles = [
      Math.clamp orbitAngles[0], -constants.camera.maxOrbitSpeed, constants.camera.maxOrbitSpeed
      Math.clamp orbitAngles[1], -constants.camera.maxOrbitSpeed, constants.camera.maxOrbitSpeed
    ]
    orbitLookAtNode (state.scene.findNode 'main-lookAt'), orbitAngles, [0.0,0.0,1.0]
  state.viewport.mouse.last = [event.clientX, event.clientY]

mouseWheel = (event) ->
  # TODO: When the camera projection mode is ortho then this will need to scale the view
  # See http://www.javascriptkit.com/javatutors/onmousewheel.shtml
  # But also note, unfortunately firefox actually appears to give different values of event.detail some times.
  # It is likely that this is due to a user having changed his scroll speed settings, thus we'll clamp the value to 1 or -1
  delta = if event.wheelDelta? then event.wheelDelta / -120.0 else Math.clamp event.detail, -1.0, 1.0

  zoomDistance = delta * constants.camera.zoomSpeedFactor #* zoomLimits[1] 
  zoomLookAtNode (state.scene.findNode 'main-lookAt'), zoomDistance #, zoomLimits

