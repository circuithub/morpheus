# Create the scene
createScene = (context) ->
  # Store the context in the state
  # TODO: support multiple contexts in future?
  state.context = context  

  # Initialize buffers
  positions = [
     0.5, 0.5,-0.5,   0.5,-0.5,-0.5,  -0.5,-0.5,-0.5,
    -0.5, 0.5,-0.5,   0.5, 0.5, 0.5,   0.5,-0.5, 0.5,
    -0.5,-0.5, 0.5,  -0.5, 0.5, 0.5,   0.5, 0.5,-0.5,
     0.5, 0.5, 0.5,   0.5,-0.5, 0.5,   0.5,-0.5,-0.5,
     0.5,-0.5,-0.5,   0.5,-0.5, 0.5,  -0.5,-0.5, 0.5,
    -0.5,-0.5,-0.5,  -0.5,-0.5,-0.5,  -0.5,-0.5, 0.5,
    -0.5, 0.5, 0.5,  -0.5, 0.5,-0.5,   0.5, 0.5, 0.5,
     0.5, 0.5,-0.5,  -0.5, 0.5,-0.5,  -0.5, 0.5, 0.5
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
  gl.scene({ 'scene': '' })
  .vertexAttrib('position', vbo, 9*8, gl.FLOAT, 3, false, 0, 0)
  .vertexElem(ibo, 6*6, gl.UNSIGNED_SHORT, 0)
  .uniform('view', gl.setMatrix4LookAt([10.0,10.0,10.0], [0.0,0.0,0.0], [0.0,1.0,0.0]))
  .uniform('projection', gl.setMatrix4Ortho(-1.0, 1.0, -1.0, 1.0, 0.1, 100.0))
  .triangles()
  return

sceneShaders = (shaders) ->
  vs = state.context.createShader state.context.VERTEX_SHADER
  fs = state.context.createShader state.context.FRAGMENT_SHADER
  state.context.shaderSource vs, shaders[0]
  state.context.shaderSource fs, shaders[1]
  program = state.context.createProgram()
  state.context.compileShader vs
  if state.context.getShaderParameter vs, state.context.COMPILE_STATUS
    state.context.attachShader program, vs
  else
    mecha.logApiError "Shader compile failed:\n#{state.context.getShaderInfoLog vs}"
  state.context.compileShader fs
  if state.context.getShaderParameter fs, state.context.COMPILE_STATUS
    state.context.attachShader program, fs
  else
    mecha.logApiError "Shader compile failed:\n#{state.context.getShaderInfoLog fs}"
  state.context.linkProgram program
  (gl 'scene').shaderProgram program
  return

runScene = (canvas, idleCallback) ->
  # Run the scene with an idle callback function
  callback = ->
    if gl.update()
      state.context.clear state.context.DEPTH_BUFFER_BIT | state.context.COLOR_BUFFER_BIT
      (gl 'scene').render state.context
    else
      idleCallback()
    self.nextFrame = window.requestAnimationFrame callback, canvas
  
  # Setup 
  state.context.viewport 0, 0, canvas.width, canvas.height
  state.context.clearColor 0.0, 0.0, 0.0, 1.0

  state.nextFrame = window.requestAnimationFrame callback, canvas
  return

