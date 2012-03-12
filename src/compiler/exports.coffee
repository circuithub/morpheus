result = exports ? {}
result.translateCSM = safeExport 'mecha.compiler.translateCSM', '', translateCSM
result.translateCSMWithArguments = safeExport 'mecha.compiler.translateCSMWithArguments', '', translateCSMWithArguments
result.compileASM = safeExport 'mecha.compiler.compileASM', null, compileASM
result.mapASM = safeExport 'mecha.compiler.mapASM', {}, mapASM
return result

