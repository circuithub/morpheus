# Create the DOM elements for the GUI (canvas etc)
create = (container) ->
  errorHtml = "<div>Could not create Mecha GUI. Please see the console for error messages.</div>"

  # Check pre-conditions
  if container != null and typeof container != 'string' and (typeof container != 'object' or container.nodeName != 'DIV')
    containerEl.innerHTML = errorHtml;
    mecha.logApiError "Mecha GUI: (ERROR) Invalid container id supplied, expected type 'string' or dom element of type 'DIV'."
    return false

  if container == null
    mecha.logApiWarning "Mecha GUI: (WARNING) No container element supplied. Creating a div element here...";
    #TODO...
  else
    containerEl = if typeof container == 'string' then document.getElementById container else container

  if containerEl == null
    mecha.logApiError "Mecha GUI: (ERROR) Invalid container id supplied, could not find a matching 'DIV' element in the document."
    return false

  containerEl.innerHTML = 
    """
    <canvas id='scenejsCanvas' width='512' height='512'>
      <p>This application requires a browser that supports the<a href='http://www.w3.org/html/wg/html5/'>HTML5</a>&lt;canvas&gt; feature.</p>
    </canvas>
    """
  init containerEl, document.getElementById 'scenejsCanvas'
  return true
