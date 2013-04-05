# The program state
# No global state is allowed to exist outside of this structure

state =
  canvas: null
  context: null
  nextFrame: null
  shader:
    program: null
    vs: null
    fs: null
  rotation: [
    1.0,0.0,0.0,
    0.0,1.0,0.0,
    0.0,0.0,1.0
  ]
  clearColor: [0.0, 0.0, 0.0, 0.0]

