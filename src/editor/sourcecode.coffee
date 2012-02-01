# Create the DOM elements for the editor
getSourceCode = safeExport 'mecha.editor.getSourceCode', '', ->
  # TODO: possibly avoid jQuery in the future
  return ($ '#mecha-source-code').val()

