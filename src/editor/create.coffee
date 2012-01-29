# Create the DOM elements for the editor
create = (domElement, sourceCode) ->
  try
    if not sourceCode?
      sourceCode = ""
    domElement.innerHTML =
      """
      <span><input id='mecha-source-autocompile' name='mecha-source-autocompile' type='checkbox' disabled='disabled'><label id='mecha-source-autocompile-label' for='mecha-source-autocompile'>Auto-compile</label></span>
      <input id='mecha-source-compile' name='mecha-source-compile' type='button' value='Compile'>
      <textarea id='mecha-source-code' name='mecha-source-code'>
      #{sourceCode}
      </textarea>
      """
  catch error
    mecha.logInternalError "Exception occurred in `mecha.editor.create`:\n", error
  return

