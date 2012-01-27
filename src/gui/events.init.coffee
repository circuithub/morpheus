# Eventful code comes here
# Program state should not be manipulated outside events files

# Initialize the canvas element (size, aspect ratio etc)
canvasInit = () ->
  windowResize()

# Initialize nodes in the scene graph
sceneInit = () ->
  csmSourceCode = mecha.generator.translateCSM state.api.sourceCode, mecha.editor.getSourceCode()

  # Run the script inside a webworker sandbox
  requestId = JSandbox.eval 
    data: csmSourceCode
    callback: (result) ->
      console.log result ## TEMPORARY
      
      # Update the model parameters
      model = state.models['scene']
      if not model?
        model = state.models['scene'] = { shaders: [], params: {}, args: {} }
      model.params = result.attr.params
      # Initialize any model arguments to their default values when they are unassigned
      for name,attr of model.params
        if not model.args[name]?
          model.args[name] = attr.defaultArg
      # Generate shaders for the model
      model.shaders = mecha.generator.compileGLSL (mecha.generator.compileASM result), model.params
      console.log model.shaders[1] ## TEMPORARY
      # Update the model in the renderer
      mecha.renderer.modelShaders 'scene', model.shaders
      mecha.renderer.modelArguments 'scene', model.args
      controlsInit()
    onerror: (data,request) ->
      mecha.logInternalError "Error compiling the solid model."

# Initialize html controls for interacting with mecha
controlsInit = () ->
  el = state.parameters.domElement
  if el?
    html = '<table>'
    for name, model of state.models
      for param, val of model.params
        html += "<tr><td><label for='#{param}'>#{val.description}</label></td><td>"
        switch val.param
          when 'range'
            switch val.type
              when 'float'
                stepAttr = if val.step then " step='#{val.step}'" else ''
                html += "<input name='#{param}' id='#{param}' class='mecha-param-range' type='range' value='#{val.defaultArg}' min='#{val.start}' max='#{val.end}'#{stepAttr}></input>"
              when 'vec2'
                stepAttr = if val.step then [" step='#{val.step[0]}'"," step='#{val.step[1]}'"] else ['','']
                html += "<div><label for='#{param}[0]'>x</label><input name='#{param}[0]' id='#{param}[0]' class='mecha-param-range' type='range' value='#{val.defaultArg[0]}' min='#{val.start[0]}' max='#{val.end[0]}'#{stepAttr[0]}></input></div>"
                html += "<div><label for='#{param}[0]'>y</label><input name='#{param}[1]' id='#{param}[1]' class='mecha-param-range' type='range' value='#{val.defaultArg[1]}' min='#{val.start[1]}' max='#{val.end[1]}'#{stepAttr[1]}></input></div>"
              when 'vec3'
                stepAttr = if val.step then [" step='#{val.step[0]}'"," step='#{val.step[1]}'"," step='#{val.step[2]}'"] else ['','','']
                html += "<div><label for='#{param}[0]'>x</label><input name='#{param}[0]' id='#{param}[0]' class='mecha-param-range' type='range' value='#{val.defaultArg[0]}' min='#{val.start[0]}' max='#{val.end[0]}'#{stepAttr[0]}></input></div>"
                html += "<div><label for='#{param}[0]'>y</label><input name='#{param}[1]' id='#{param}[1]' class='mecha-param-range' type='range' value='#{val.defaultArg[1]}' min='#{val.start[1]}' max='#{val.end[1]}'#{stepAttr[1]}></input></div>"
                html += "<div><label for='#{param}[0]'>z</label><input name='#{param}[2]' id='#{param}[2]' class='mecha-param-range' type='range' value='#{val.defaultArg[2]}' min='#{val.start[2]}' max='#{val.end[2]}'#{stepAttr[2]}></input></div>"
              when 'vec4'
                stepAttr = if val.step then [" step='#{val.step[0]}'"," step='#{val.step[1]}'"," step='#{val.step[2]}'"," step='#{val.step[3]}'"] else ['','','','']
                html += "<div><label for='#{param}[0]'>x</label><input name='#{param}[0]' id='#{param}[0]' class='mecha-param-range' type='range' value='#{val.defaultArg[0]}' min='#{val.start[0]}' max='#{val.end[0]}'#{stepAttr[0]}></input></div>"
                html += "<div><label for='#{param}[0]'>y</label><input name='#{param}[1]' id='#{param}[1]' class='mecha-param-range' type='range' value='#{val.defaultArg[1]}' min='#{val.start[1]}' max='#{val.end[1]}'#{stepAttr[1]}></input></div>"
                html += "<div><label for='#{param}[0]'>z</label><input name='#{param}[2]' id='#{param}[2]' class='mecha-param-range' type='range' value='#{val.defaultArg[2]}' min='#{val.start[2]}' max='#{val.end[2]}'#{stepAttr[2]}></input></div>"
                html += "<div><label for='#{param}[0]'>w</label><input name='#{param}[3]' id='#{param}[3]' class='mecha-param-range' type='range' value='#{val.defaultArg[3]}' min='#{val.start[3]}' max='#{val.end[3]}'#{stepAttr[3]}></input></div>"
              else
                mecha.logInternalError "Unknown range type `#{val.type}` for parameter `#{param}`."
          when 'number'
            switch val.type
              when 'float'
                html += "<input name='#{param}' id='#{param}' class='mecha-param-number' type='number' value='#{val.defaultArg}'></input>"
              when 'vec2'
                html += "<div><label for='#{param}[0]'>x</label><input name='#{param}[0]' id='#{param}[0]' class='mecha-param-number' type='number' value='#{val.defaultArg[0]}'></input></div>"
                html += "<div><label for='#{param}[0]'>y</label><input name='#{param}[1]' id='#{param}[1]' class='mecha-param-number' type='number' value='#{val.defaultArg[1]}'></input></div>"
              when 'vec3'
                html += "<div><label for='#{param}[0]'>x</label><input name='#{param}[0]' id='#{param}[0]' class='mecha-param-number' type='number' value='#{val.defaultArg[0]}'></input></div>"
                html += "<div><label for='#{param}[1]'>y</label><input name='#{param}[1]' id='#{param}[1]' class='mecha-param-number' type='number' value='#{val.defaultArg[1]}'></input></div>"
                html += "<div><label for='#{param}[2]'>z</label><input name='#{param}[2]' id='#{param}[2]' class='mecha-param-number' type='number' value='#{val.defaultArg[2]}'></input></div>"
              when 'vec4'
                html += "<div><label for='#{param}[0]'>x</label><input name='#{param}[0]' id='#{param}[0]' class='mecha-param-number' type='number' value='#{val.defaultArg[0]}'></input></div>"
                html += "<div><label for='#{param}[1]'>y</label><input name='#{param}[1]' id='#{param}[1]' class='mecha-param-number' type='number' value='#{val.defaultArg[1]}'></input></div>"
                html += "<div><label for='#{param}[2]'>z</label><input name='#{param}[2]' id='#{param}[2]' class='mecha-param-number' type='number' value='#{val.defaultArg[2]}'></input></div>"
                html += "<div><label for='#{param}[3]'>w</label><input name='#{param}[3]' id='#{param}[3]' class='mecha-param-number' type='number' value='#{val.defaultArg[3]}'></input></div>"
              else
                mecha.logInternalError "Unknown number type `#{val.type}` for parameter `#{param}`."
        html += "</td></tr>"
    html += '</table>'
    el.innerHTML = html

# Initialize the CSM API (by loading the code from the given url)
apiInit = (callback) ->
  # Get the API code
  $apiLink = $ "link[rel='api']"
  if typeof state.paths.mechaUrlRoot == 'string' 
    state.api.url = 
      if state.paths.mechaUrlRoot.length == 0 or state.paths.mechaUrlRoot[state.paths.mechaUrlRoot.length - 1] == '/'
        state.paths.mechaUrlRoot + 'mecha-api.min.js'
      else
        state.paths.mechaUrlRoot + '/mecha-api.min.js'
  else if $apiLink.length > 0
    state.api.url = $apiLink.attr 'href'
  else 
    state.api.url = 'mecha-api.min.js'
  #($.get (encodeURIComponent state.api.url), undefined, undefined, 'text')
  ($.get state.api.url, undefined, undefined, 'text')
    .success (data, textStatus, jqXHR) ->
      # TODO: test that the correct api was actually fetched
      state.api.sourceCode = data
      mecha.log "Loaded " + state.api.url
      callback() if callback?
    .error () ->
      mecha.log "Error loading API script"

# Initialize the gui controls and register events once the rest of the document has completely loaded
init = (containerEl, canvasEl) ->
  state.viewport.domElement = containerEl
  state.canvas = canvasEl
  if state.canvas?
    state.scene = mecha.renderer.createScene state.canvas.getContext 'experimental-webgl'
    mecha.renderer.runScene state.canvas, (->)
  canvasInit()
  apiInit sceneInit
  registerDOMEvents()
  registerEditorEvents()
  state.application.initialized = true

