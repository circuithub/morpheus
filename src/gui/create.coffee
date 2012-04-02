# Create the DOM elements for the GUI (canvas etc)
create = safeExport 'mecha.gui.create', false, (container, jsandboxUrl, mechaUrlRoot, fixedWidth, fixedHeight, canvas) ->
  errorHtml = "<div>Could not create Mecha GUI. Please see the console for error messages.</div>"

  # Default paramters
  fixedWidth = 512 if not fixedWidth?
  fixedHeight = 512 if not fixedHeight?

  # Check pre-conditions
  if container? and typeof container != 'string' and (typeof container != 'object' or container.nodeName != 'DIV')
    containerEl.innerHTML = errorHtml
    mecha.logApiError "Mecha GUI: (ERROR) Invalid container with type '#{typeof container}' supplied, expected type 'string' or dom element of type 'DIV'."
    return false
  else if not container?
    mecha.logApiWarning "Mecha GUI: (WARNING) No container element supplied. Creating a div element here...";
    #TODO...
  else
    containerEl = if typeof container == 'string' then document.getElementById container else container

  if containerEl == null
    mecha.logApiError "Mecha GUI: (ERROR) Invalid container id '#{container}' supplied, could not find a matching 'DIV' element in the document."
    return false

  if canvas? and typeof canvas != 'string' and (typeof canvas != 'object' or canvas.nodeName != 'CANVAS')
    containerEl.innerHTML = errorHtml
    mecha.logApiError "Mecha GUI: (ERROR) Invalid canvas with type '#{typeof canvas}' supplied, expected type 'string' or dom element of type 'DIV' or none at all."
  else if not canvas?
    containerEl.innerHTML = 
      """
      <canvas id='mecha-canvas' width='#{fixedWidth}' height='#{fixedHeight}'>
        <p>This application requires a browser that supports the<a href='http://www.w3.org/html/wg/html5/'>HTML5</a>&lt;canvas&gt; feature.</p>
      </canvas>
      """ + containerEl.innerHTML
    # TODO: Search in container element only
    canvasEl = document.getElementById 'mecha-canvas'
  else
    # TODO: Search in container element only, or canvas must be child of container
    canvasEl = if typeof canvas == 'string' then document.getElementById canvas else canvas

  if canvasEl == null
    mecha.logApiError "Mecha GUI: (ERROR) Invalid canvas id '#{container}' supplied, could not find a matching 'CANVAS' element in the container."
    return false
  canvasEl['width'] = fixedWidth
  canvasEl['height'] = fixedHeight

  # Store url's to dynamically loaded libraries
  if jsandboxUrl?
    state.paths.jsandboxUrl = jsandboxUrl
  if mechaUrlRoot?
    state.paths.mechaUrlRoot = mechaUrlRoot

  # Initialize the sandbox with the given sandbox worker url
  if state.paths.jsandboxUrl?
    JSandbox.create state.paths.jsandboxUrl

  # Initialize the application
  init containerEl, canvasEl
  return true

createControls = safeExport 'mecha.gui.createControls', false, (container) ->
  # Check pre-conditions
  if container != null and typeof container != 'string' and (typeof container != 'object' or container.nodeName != 'DIV')
    mecha.logApiError "Mecha GUI: (ERROR) Invalid container id '#{container}' supplied, expected type 'string' or dom element of type 'DIV'."
    return false
  else if container == null
    mecha.logApiWarning "Mecha GUI: (WARNING) No container element supplied. Creating a div element here...";
    #TODO...
  else
    containerEl = if typeof container == 'string' then document.getElementById container else container

  if containerEl == null
    mecha.logApiError "Mecha GUI: (ERROR) Invalid container id '#{container}' supplied, could not find a matching 'DIV' element in the document."
    return false

  if not state.parameters.domElement?
    state.parameters.domElement = document.createElement 'form'
    state.parameters.domElement.id = 'mecha-param-inputs'
    containerEl.appendChild state.parameters.domElement
  
  controlsInit() 
  registerControlEvents()
  return true

