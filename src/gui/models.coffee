getModelParameters = safeExport 'mecha.gui.getModelParameters', {}, (modelName) ->
  return state.models[modelName].params if modelName? and state.models[modelName]?
  for key in state.models
    return state.models[key].params
  return {}

getModelArguments = safeExport 'mecha.gui.getModelParameters', {}, (modelName) ->
  return state.models[modelName].args if modelName? and state.models[modelName]?
  for key in state.models
    return state.models[key].args
  return {}

