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
    controls = for modelName, model of state.models
      parameterize.html getModelParameters modelName
    el.innerHTML = ""
    el.appendChild c for c in controls
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
      callback? morpheusScriptCode
    .error ->
      morpheus.log "Error loading API script"

# Initialize the gui controls and register events once the rest of the document has completely loaded
init = (containerEl, canvasEl, callback) ->
  state.viewport.domElement = containerEl
  state.canvas = canvasEl
  if state.canvas?
    state.scene = morpheus.renderer.createScene state.canvas.getContext 'experimental-webgl'
    morpheus.renderer.runScene null
  canvasInit()
  morpheusScriptCode = (morpheus.editor?.getSourceCode state.editor.domElement) ? ""
  apiInit morpheusScriptCode, ->
    callback?()
    sceneScript morpheusScriptCode if not state.application.sceneInitialized
  registerDOMEvents()
  state.application.initialized = true

