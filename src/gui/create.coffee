# Create the DOM elements for the GUI (canvas etc)
create = (container, jsandboxUrl, mechaUrlRoot) ->
  errorHtml = "<div>Could not create Mecha GUI. Please see the console for error messages.</div>"

  # Check pre-conditions
  if container != null and typeof container != 'string' and (typeof container != 'object' or container.nodeName != 'DIV')
    containerEl.innerHTML = errorHtml;
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

  containerEl.innerHTML = 
    """
    <canvas id='mecha-canvas' width='512' height='512'>
      <p>This application requires a browser that supports the<a href='http://www.w3.org/html/wg/html5/'>HTML5</a>&lt;canvas&gt; feature.</p>
    </canvas>
    """ + containerEl.innerHTML

  # Store url's to dynamically loaded libraries
  if jsandboxUrl?
    state.paths.jsandboxUrl = jsandboxUrl
  if mechaUrlRoot?
    state.paths.mechaUrlRoot = mechaUrlRoot

  # Initialize the sandbox with the given sandbox worker url
  if state.paths.jsandboxUrl?
    JSandbox.create state.paths.jsandboxUrl

  # Initialize the application
  init containerEl, document.getElementById 'mecha-canvas'
  return true

createControls = (container) ->
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
