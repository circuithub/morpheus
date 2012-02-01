# Create the scene
createScene = safeExport 'mecha.renderer.createScene', undefined, (context) ->
  #try
  # Store the context in the state
  # TODO: support multiple contexts in future?
  state.context = context  

  # Initialize buffers
  # TODO: Use the model boundaries to set up the box bounds
  positions = [
     1.0, 1.0,-1.0,   1.0,-1.0,-1.0,  -1.0,-1.0,-1.0,
    -1.0, 1.0,-1.0,   1.0, 1.0, 1.0,   1.0,-1.0, 1.0,
    -1.0,-1.0, 1.0,  -1.0, 1.0, 1.0,   1.0, 1.0,-1.0,
     1.0, 1.0, 1.0,   1.0,-1.0, 1.0,   1.0,-1.0,-1.0,
     1.0,-1.0,-1.0,   1.0,-1.0, 1.0,  -1.0,-1.0, 1.0,
    -1.0,-1.0,-1.0,  -1.0,-1.0,-1.0,  -1.0,-1.0, 1.0,
    -1.0, 1.0, 1.0,  -1.0, 1.0,-1.0,   1.0, 1.0, 1.0,
     1.0, 1.0,-1.0,  -1.0, 1.0,-1.0,  -1.0, 1.0, 1.0
  ]
  indices = [
     0, 1, 2,   0, 2, 3,
     4, 7, 6,   4, 6, 5,
     8, 9,10,   8,10,11,
    12,13,14,  12,14,15,
    16,17,18,  16,18,19,
    20,21,22,  20,22,23 
  ]

  vbo = context.createBuffer()
  context.bindBuffer context.ARRAY_BUFFER, vbo
  context.bufferData context.ARRAY_BUFFER, (new Float32Array positions), context.STATIC_DRAW

  ibo = context.createBuffer()
  context.bindBuffer context.ELEMENT_ARRAY_BUFFER, ibo
  context.bufferData context.ELEMENT_ARRAY_BUFFER, (new Uint16Array indices), context.STATIC_DRAW
  
  # Create the scene
  # TODO: Use the model boundaries to set up the projection parameters and the camera distance
  gl.scene({ 'scene': '' })
  .vertexAttrib('position', vbo, 9*8, gl.FLOAT, 3, false, 0, 0)
  .vertexElem(ibo, 6*6, gl.UNSIGNED_SHORT, 0)
  .uniform('view', gl.matrix4.newLookAt([10.0,10.0,10.0], [0.0,0.0,0.0], [0.0,0.0,1.0]))
  .uniform('projection', gl.matrix4.newOrtho(-math_sqrt2, math_sqrt2, -math_sqrt2, math_sqrt2, 0.1, 100.0))
  .uniform('model', state.rotation)
  .triangles()
  #catch error
  #  mecha.logInternalError "Exception occurred in `mecha.renderer.createScene`:\n", error
  return

runScene = safeExport 'mecha.renderer.runScene', undefined, (canvas, idleCallback) ->
  #try
  # Setup rendering parameters
  state.context.viewport 0, 0, canvas.width, canvas.height
  state.context.clearColor 0.0, 0.0, 0.0, 0.0

  # Run the scene with an idle callback function
  callback = safeExport 'mecha.renderer: render', undefined, ->
    if gl.update()
      state.context.clear state.context.DEPTH_BUFFER_BIT | state.context.COLOR_BUFFER_BIT
      (gl 'scene').render state.context
    else
      idleCallback()
    self.nextFrame = window.requestAnimationFrame callback, canvas
  state.nextFrame = window.requestAnimationFrame callback, canvas
  #catch error
  #  mecha.logInternalError "Exception occurred in `mecha.renderer.runScene`:\n", error
  return

