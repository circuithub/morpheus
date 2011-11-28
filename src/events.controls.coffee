# Eventful code comes here
# Program state should not be manipulated outside events files

controlsSourceCompile = () ->
  # TODO: This is only temporary to avoid Chrome's debugger crashing and the shader loading improved
  sceneInit()
  try
    # TODO: SceneJS does not yet support updating the shader like this
    compileCSM ($ '#source-code').val(), 
      (result) ->
        #console.log compileGLSL compileASM result
        (state.scene.findNode 'main-shader').set 'shaders', [
            stage: 'fragment',
            code: compileGLSL compileASM result
          ]
  catch error
    mecha.log error

