# Create the DOM elements for the editor
create = safeExport 'morpheus.editor.create', undefined, (domElement, sourceCode) ->
  if not sourceCode?
    sourceCode = ""
  domElement.innerHTML =
    """
    <span><input id='morpheus-source-autocompile' name='morpheus-source-autocompile' type='checkbox' disabled='disabled'><label id='morpheus-source-autocompile-label' for='morpheus-source-autocompile'>Auto-compile</label></span>
    <input id='morpheus-source-compile' name='morpheus-source-compile' type='button' value='Compile'>
    <textarea id='morpheus-source-code' name='morpheus-source-code'>
    #{sourceCode}
    </textarea>
    """
  return

