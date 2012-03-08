result = exports ? {}
result.translateCSM = safeExport 'mecha.compiler.translateCSM', '', translateCSM
result.compileASM = safeExport 'mecha.compiler.compileASM', null, compileASM
result.mapASM = safeExport 'mecha.compiler.mapASM', {}, mapASM
return result

