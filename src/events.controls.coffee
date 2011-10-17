# Eventful code comes here
# Program state should not be manipulated outside events files

controlsSourceCompile = () ->
  try
    (state.scene.findNode 'main-shader').set 'shaders', [
        stage: 'fragment',
        code: compileGLSL compileASM ($ '#source-code').val()
      ]
  catch error
    if console? and console.log?
      console.log error

