# Create the DOM elements for the editor
getSourceCode = safeExport 'morpheus.editor.getSourceCode', '', ->
  # TODO: possibly avoid jQuery in the future
  return ($ '#morpheus-source-code').val()

