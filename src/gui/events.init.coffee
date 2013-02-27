# Eventful code comes here
# Program state should not be manipulated outside events files

# Initialize the canvas element (size, aspect ratio etc)
canvasInit = () ->
  windowResize()

# Initialize html controls for interacting with morpheus
controlsInit = safeExport 'morpheus.gui: controlsInit', undefined, () ->
  roundDecimals = (n) ->
    # Throw away digits separated by one or more 0's in the number's decimals
    parts = (String n).split '.'
    if parts.length == 1
      return parts[0]
    nonzeroDigits = parts[1].match /[1-9]+/g
    zeroDigits = parts[1].match /^0+/
    if nonzeroDigits.length == 0
      return parts[0]
    if zeroDigits.length > 0
      return "#{parts[0]}.#{zeroDigits[0]}#{nonzeroDigits[0]}"
    return "#{parts[0]}.#{nonzeroDigits[0]}"

  el = state.parameters.domElement
  if el?
    ### TODO: Replace with parameterize-form
    html = '<table>'
    for name, model of state.models
      for param, val of model.params
        html += "<tr><td><label for='#{param}'>#{val.description}</label></td><td>"
        switch val.param
          when 'range'
            switch val.type
              when 'float'
                stepAttr = if val.step? then " step='#{val.step}'" else ''
                html += "<input name='#{param}' id='#{param}' class='morpheus-param-range' type='range' value='#{val.defaultArg}' min='#{val.start}' max='#{val.end}'#{stepAttr}></input>"
              when 'vec2'
                stepAttr = if val.step? then [" step='#{val.step[0]}'"," step='#{val.step[1]}'"] else ['','']
                html += "<div><label for='#{param}[0]'>x</label><input name='#{param}[0]' id='#{param}[0]' class='morpheus-param-range' type='range' value='#{val.defaultArg[0]}' min='#{val.start[0]}' max='#{val.end[0]}'#{stepAttr[0]}></input></div>"
                html += "<div><label for='#{param}[0]'>y</label><input name='#{param}[1]' id='#{param}[1]' class='morpheus-param-range' type='range' value='#{val.defaultArg[1]}' min='#{val.start[1]}' max='#{val.end[1]}'#{stepAttr[1]}></input></div>"
              when 'vec3'
                stepAttr = if val.step? then [" step='#{val.step[0]}'"," step='#{val.step[1]}'"," step='#{val.step[2]}'"] else ['','','']
                html += "<div><label for='#{param}[0]'>x</label><input name='#{param}[0]' id='#{param}[0]' class='morpheus-param-range' type='range' value='#{val.defaultArg[0]}' min='#{val.start[0]}' max='#{val.end[0]}'#{stepAttr[0]}></input></div>"
                html += "<div><label for='#{param}[0]'>y</label><input name='#{param}[1]' id='#{param}[1]' class='morpheus-param-range' type='range' value='#{val.defaultArg[1]}' min='#{val.start[1]}' max='#{val.end[1]}'#{stepAttr[1]}></input></div>"
                html += "<div><label for='#{param}[0]'>z</label><input name='#{param}[2]' id='#{param}[2]' class='morpheus-param-range' type='range' value='#{val.defaultArg[2]}' min='#{val.start[2]}' max='#{val.end[2]}'#{stepAttr[2]}></input></div>"
              when 'vec4'
                stepAttr = if val.step? then [" step='#{val.step[0]}'"," step='#{val.step[1]}'"," step='#{val.step[2]}'"," step='#{val.step[3]}'"] else ['','','','']
                html += "<div><label for='#{param}[0]'>x</label><input name='#{param}[0]' id='#{param}[0]' class='morpheus-param-range' type='range' value='#{val.defaultArg[0]}' min='#{val.start[0]}' max='#{val.end[0]}'#{stepAttr[0]}></input></div>"
                html += "<div><label for='#{param}[0]'>y</label><input name='#{param}[1]' id='#{param}[1]' class='morpheus-param-range' type='range' value='#{val.defaultArg[1]}' min='#{val.start[1]}' max='#{val.end[1]}'#{stepAttr[1]}></input></div>"
                html += "<div><label for='#{param}[0]'>z</label><input name='#{param}[2]' id='#{param}[2]' class='morpheus-param-range' type='range' value='#{val.defaultArg[2]}' min='#{val.start[2]}' max='#{val.end[2]}'#{stepAttr[2]}></input></div>"
                html += "<div><label for='#{param}[0]'>w</label><input name='#{param}[3]' id='#{param}[3]' class='morpheus-param-range' type='range' value='#{val.defaultArg[3]}' min='#{val.start[3]}' max='#{val.end[3]}'#{stepAttr[3]}></input></div>"
              else
                morpheus.logInternalError "Unknown range type `#{val.type}` for parameter `#{param}`."
          when 'number'
            switch val.type
              when 'float'
                minAttr = if val.start? then " min='#{val.start}'" else ''
                maxAttr = if val.end? then " max='#{val.end}'" else ''
                stepAttr = if val.step? then " step='#{roundDecimals val.step}'" else ''
                html += "<input name='#{param}' id='#{param}' class='morpheus-param-number' type='number' value='#{val.defaultArg}'#{minAttr}#{maxAttr}#{stepAttr}></input>"
              when 'vec2'
                minAttr = if val.start? then [" min='#{val.start[0]}'"," min='#{val.start[1]}'"] else ['','']
                maxAttr = if val.end? then [" max='#{val.end[0]}'"," max='#{val.end[1]}'"] else ['','']
                stepAttr = if val.step? then [" step='#{roundDecimals val.step[0]}'"," step='#{roundDecimals val.step[1]}'"] else ['','']
                html += "<div><label for='#{param}[0]'>x</label><input name='#{param}[0]' id='#{param}[0]' class='morpheus-param-number' type='number' value='#{val.defaultArg[0]}'#{minAttr[0]}#{maxAttr[0]}#{stepAttr[0]}></input></div>"
                html += "<div><label for='#{param}[1]'>y</label><input name='#{param}[1]' id='#{param}[1]' class='morpheus-param-number' type='number' value='#{val.defaultArg[1]}'#{minAttr[1]}#{maxAttr[1]}#{stepAttr[1]}></input></div>"
              when 'vec3'
                minAttr = if val.start? then [" min='#{val.start[0]}'"," min='#{val.start[1]}'"," min='#{val.start[2]}'"] else ['','','']
                maxAttr = if val.end? then [" max='#{val.end[0]}'"," max='#{val.end[1]}'"," max='#{val.end[2]}'"] else ['','','']
                stepAttr = if val.step? then [" step='#{roundDecimals val.step[0]}'"," step='#{roundDecimals val.step[1]}'"," step='#{roundDecimals val.step[2]}'"] else ['','','']
                html += "<div><label for='#{param}[0]'>x</label><input name='#{param}[0]' id='#{param}[0]' class='morpheus-param-number' type='number' value='#{val.defaultArg[0]}'#{minAttr[0]}#{maxAttr[0]}#{stepAttr[0]}></input></div>"
                html += "<div><label for='#{param}[1]'>y</label><input name='#{param}[1]' id='#{param}[1]' class='morpheus-param-number' type='number' value='#{val.defaultArg[1]}'#{minAttr[1]}#{maxAttr[1]}#{stepAttr[1]}></input></div>"
                html += "<div><label for='#{param}[2]'>z</label><input name='#{param}[2]' id='#{param}[2]' class='morpheus-param-number' type='number' value='#{val.defaultArg[2]}'#{minAttr[2]}#{maxAttr[2]}#{stepAttr[2]}></input></div>"
              when 'vec4'
                minAttr = if val.start? then [" min='#{val.start[0]}'"," min='#{val.start[1]}'"," min='#{val.start[2]}'"," min='#{val.start[3]}'"] else ['','','','']
                maxAttr = if val.end? then [" max='#{val.end[0]}'"," max='#{val.end[1]}'"," max='#{val.end[2]}'"," max='#{val.end[3]}'"] else ['','','','']
                stepAttr = if val.step? then [" step='#{roundDecimals val.step[0]}'"," step='#{roundDecimals val.step[1]}'"," step='#{roundDecimals val.step[2]}'"," step='#{roundDecimals val.step[3]}'"] else ['','','','']
                html += "<div><label for='#{param}[0]'>x</label><input name='#{param}[0]' id='#{param}[0]' class='morpheus-param-number' type='number' value='#{val.defaultArg[0]}'#{minAttr[0]}#{maxAttr[0]}#{stepAttr[0]}></input></div>"
                html += "<div><label for='#{param}[1]'>y</label><input name='#{param}[1]' id='#{param}[1]' class='morpheus-param-number' type='number' value='#{val.defaultArg[1]}'#{minAttr[1]}#{maxAttr[1]}#{stepAttr[1]}></input></div>"
                html += "<div><label for='#{param}[2]'>z</label><input name='#{param}[2]' id='#{param}[2]' class='morpheus-param-number' type='number' value='#{val.defaultArg[2]}'#{minAttr[2]}#{maxAttr[2]}#{stepAttr[2]}></input></div>"
                html += "<div><label for='#{param}[3]'>w</label><input name='#{param}[3]' id='#{param}[3]' class='morpheus-param-number' type='number' value='#{val.defaultArg[3]}'#{minAttr[3]}#{maxAttr[3]}#{stepAttr[3]}></input></div>"
              else
                morpheus.logInternalError "Unknown number type `#{val.type}` for parameter `#{param}`."
        html += "</td></tr>"
    html += '</table>'
    el.innerHTML = html
    ###
    el.innerHTML = "<div>TODO</div>"
  return

# Initialize the CSM API (by loading the code from the given url)
apiInit = (morpheusScriptCode, callback) ->
  # Get the API code
  $apiLink = $ "link[rel='api']"
  if typeof state.paths.morpheusUrlRoot == 'string' 
    state.api.url =
      if state.paths.morpheusUrlRoot.length == 0 or state.paths.morpheusUrlRoot[state.paths.morpheusUrlRoot.length - 1] == '/'
        state.paths.morpheusUrlRoot + 'morpheus-api.min.js'
      else
        state.paths.morpheusUrlRoot + '/morpheus-api.min.js'
  else if $apiLink.length > 0
    state.api.url = $apiLink.attr 'href'
  else 
    state.api.url = 'morpheus-api.min.js'
  #($.get (encodeURIComponent state.api.url), undefined, undefined, 'text')
  ($.get state.api.url, undefined, undefined, 'text')
    .success (data, textStatus, jqXHR) ->
      # TODO: test that the correct api was actually fetched
      state.api.sourceCode = data
      morpheus.log "Loaded " + state.api.url
      callback?(morpheusScriptCode)
    .error () ->
      morpheus.log "Error loading API script"

# Initialize the gui controls and register events once the rest of the document has completely loaded
init = (containerEl, canvasEl, callback) ->
  state.viewport.domElement = containerEl
  state.canvas = canvasEl
  if state.canvas?
    state.scene = morpheus.renderer.createScene state.canvas.getContext 'experimental-webgl'
    morpheus.renderer.runScene state.canvas, (->)
  canvasInit()
  morpheusScriptCode = morpheus.editor?.getSourceCode() ? ""
  apiInit morpheusScriptCode, ->
    callback?()
    sceneScript morpheusScriptCode if not state.application.sceneInitialized
  registerDOMEvents()
  registerEditorEvents()
  state.application.initialized = true

