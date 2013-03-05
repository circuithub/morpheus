wrapParams = (params) ->
  parameterize.form.parameters "", 
    parameterize.form.section "",
      (param for name, param of params)...

getModelParameters = safeExport 'morpheus.gui.getModelParameters', {}, (modelName) ->
  return wrapParams state.models[modelName].params if modelName? and state.models[modelName]?
  for key,val in state.models
    return wrapParams val.params
  return {}

getModelArguments = safeExport 'morpheus.gui.getModelParameters', {}, (modelName) ->
  return state.models[modelName].args if modelName? and state.models[modelName]?
  for key, val of state.models
    return val.args
  return {}

###
getModelDefaultArguments = safeExport 'morpheus.gui.getModelParameters', {}, (modelName) ->
  params = state?.models[modelName]?.params
  for name,attr of params
    if not (name in model.args)
      [id,meta,defaultValue] = ["", {}, 0]
      switch attr._tag
        when 'tolerance'
          [id,meta,defaultValue] = attr[0] # unwrap tolerance tag
          if Array.isArray defaultValue.min
            defaultValue = ((defaultValue.min[i] + defaultValue.max[i]) * 0.5 for i in [0...defaultValue.min.length])
          else
            defaultValue = (defaultValue.min + defaultValue.max) * 0.5
        when 'range'
          throw "TODO: Range not yet implemented"
        else
          [id,meta,defaultValue] = attr
      model.args[name] = defaultValue # TODO: handle tolerance value here?
###

