result = exports ? {}
result.createScene = safeExport 'mecha.renderer.createScene', undefined, createScene
result.runScene = safeExport 'mecha.renderer.runScene', undefined, runScene
result.modelShaders = safeExport 'mecha.renderer.modelShaders', false, modelShaders
result.modelArguments = safeExport 'mecha.renderer.modelArguments', undefined, modelArguments
result.modelRotate = safeExport 'mecha.renderer.modelRotate', undefined, modelRotate
return result

