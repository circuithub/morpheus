# Create the DOM elements for the GUI (canvas etc)
create = safeExport 'morpheus.gui.create', false, (container, jsandboxUrl, morpheusUrlRoot, fixedWidth, fixedHeight, callback) ->
  errorHtml = "<div>Could not create Morpheus GUI. Please see the console for error messages.</div>"

  # Default paramters
  fixedWidth = 512 if not fixedWidth?
  fixedHeight = 512 if not fixedHeight?

  # Check pre-conditions
  if container != null and typeof container != 'string' and (typeof container != 'object' or container.nodeName != 'DIV')
    containerEl.innerHTML = errorHtml;
    morpheus.logApiError "Morpheus GUI: (ERROR) Invalid container id '#{container}' supplied, expected type 'string' or dom element of type 'DIV'."
    return false
  else if container == null
    morpheus.logApiWarning "Morpheus GUI: (WARNING) No container element supplied. Creating a div element here...";
    #TODO...
  else
    containerEl = if typeof container == 'string' then document.getElementById container else container

  if containerEl == null
    morpheus.logApiError "Morpheus GUI: (ERROR) Invalid container id '#{container}' supplied, could not find a matching 'DIV' element in the document."
    return false

  containerEl.innerHTML = 
    """
    <canvas id='morpheus-canvas' width='#{fixedWidth}' height='#{fixedHeight}'>
      <p>This application requires a browser that supports the<a href='http://www.w3.org/html/wg/html5/'>HTML5</a>&lt;canvas&gt; feature.</p>
    </canvas>
    """ + containerEl.innerHTML

  # Store url's to dynamically loaded libraries
  if jsandboxUrl?
    state.paths.jsandboxUrl = jsandboxUrl
  if morpheusUrlRoot?
    state.paths.morpheusUrlRoot = morpheusUrlRoot

  # Initialize the sandbox with the given sandbox worker url
  if state.paths.jsandboxUrl?
    JSandbox.create state.paths.jsandboxUrl

  # Initialize the application
  init containerEl, (document.getElementById 'morpheus-canvas'), callback
  return true

createControls = safeExport 'morpheus.gui.createControls', false, (container) ->
  # Check pre-conditions
  if container != null and typeof container != 'string' and (typeof container != 'object' or container.nodeName != 'DIV')
    morpheus.logApiError "Morpheus GUI: (ERROR) Invalid container id '#{container}' supplied, expected type 'string' or dom element of type 'DIV'."
    return false
  else if container == null
    morpheus.logApiWarning "Morpheus GUI: (WARNING) No container element supplied. Creating a div element here...";
    #TODO...
  else
    containerEl = if typeof container == 'string' then document.getElementById container else container

  if containerEl == null
    morpheus.logApiError "Morpheus GUI: (ERROR) Invalid container id '#{container}' supplied, could not find a matching 'DIV' element in the document."
    return false

  if not state.parameters.domElement?
    state.parameters.domElement = containerEl

  controlsInit()
  registerControlEvents()
  return true
