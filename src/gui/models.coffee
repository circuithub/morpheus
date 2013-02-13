getModelParameters = safeExport 'morpheus.gui.getModelParameters', {}, (modelName) ->
  return state.models[modelName].params if modelName? and state.models[modelName]?
  for key,val in state.models
    return val.params
  return {}

getModelArguments = safeExport 'morpheus.gui.getModelParameters', {}, (modelName) ->
  return state.models[modelName].args if modelName? and state.models[modelName]?
  for key, val of state.models
    return val.args
  return {}

