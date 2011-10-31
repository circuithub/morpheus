# Eventful code comes here
# Program state should not be manipulated outside events files

controlsSourceCompile = () ->
  try
    # TODO: SceneJS does not yet support updating the shader like this
    (state.scene.findNode 'main-shader').set 'shaders', [
        stage: 'fragment',
        code: compileCSM(($ '#source-code').val(), (result) -> compileGLSL compileASM result)
      ]
  catch error
    mecha.log error

