# Eventful code comes here
# Program state should not be manipulated outside events files

controlsSourceCompile = () ->
  try
    # TODO: SceneJS does not yet support updating the shader like this
    compileCSM ($ '#source-code').val(), 
      (result) ->
        #console.log compileGLSL compileASM result
        (state.scene.findNode 'main-shader').set 'shaders', [
            stage: 'fragment',
            code:  compileGLSL compileASM result
          ]
  catch error
    mecha.log error

