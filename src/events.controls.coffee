# Eventful code comes here
# Program state should not be manipulated outside events files

controlsSourceCompile = () ->
  console.log "hello"
  try
    (state.scene.findNode 'cube-transform').set 'shaders', [
        stage: 'fragment',
        code: compileGLSL compileAST ($ '#source-code').val()
      ]
  catch error
    if console? and console.log?
      console.log error

