# Create the scene
createScene = (context) ->
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
  .uniform('view', gl.setMatrix4Identity())
  .triangles()

