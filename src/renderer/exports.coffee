exports = exports ? {}
exports.createScene = createScene
exports.runScene = runScene
exports.modelShaders = modelShaders
exports.modelArguments = modelArguments
exports.modelRotate = modelRotate
exports.clearColor = clearColor

# Accessors
exports.getRenderingContext = -> return state.context

return exports

