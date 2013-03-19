# Create the DOM elements for the editor
getSourceCode = safeExport 'morpheus.editor.getSourceCode', '', (containerSelector) ->
  # TODO: possibly avoid jQuery in the future
  return (($ (containerSelector ? document)).find '.morpheus-source-code').val()

