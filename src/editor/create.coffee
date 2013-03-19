# Create the DOM elements for the editor
create = safeExport 'morpheus.editor.create', undefined, (containerSelector, sourceCode) ->
  if not sourceCode?
    sourceCode = ""
  #domElement.innerHTML =
  ($ containerSelector).html """
    <span><input class='morpheus-source-autocompile' name='morpheus-source-autocompile' type='checkbox' disabled='disabled'><label class='morpheus-source-autocompile-label' for='morpheus-source-autocompile'>Auto-compile</label></span>
    <input class='morpheus-source-compile' name='morpheus-source-compile' type='button' value='Compile'>
    <textarea class='morpheus-source-code' name='morpheus-source-code'>
    #{sourceCode}
    </textarea>
    """
  return

