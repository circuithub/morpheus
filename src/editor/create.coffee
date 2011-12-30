# Create the DOM elements for the editor
create = (domElement, sourceCode) ->
  if not sourceCode?
    sourceCode = ""
  domElement.innerHTML =
    """
    <span><input id='source-autocompile' name='source-autocompile' type='checkbox' disabled='disabled'><label for='source-autocompile'>Auto-compile</label></span>
    <input id='source-compile' name='source-compile' type='button' value='Compile'>
    <textarea id='source-code' name='source-code'>
    #{sourceCode}
    </textarea>
    """
  return
