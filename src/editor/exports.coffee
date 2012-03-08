result = exports ? {}
result.create = safeExport 'mecha.editor.create', undefined, create
result.getSourceCode = safeExport 'mecha.editor.getSourceCode', '', getSourceCode
return result

