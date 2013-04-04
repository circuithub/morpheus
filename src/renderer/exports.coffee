exports = exports ? {}
exports.createScene = createScene
exports.runScene = runScene
exports.modelShaders = modelShaders
exports.modelArguments = modelArguments
exports.modelRotate = modelRotate

# Accessors
exports.clearColor = (r,g,b,a) -> state.clearColor = [arguments...]
exports.getRenderingContext = -> return state.context

return exports

