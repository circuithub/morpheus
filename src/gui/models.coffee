wrapParams = (params) ->
  parameterize.form.parameters "", 
    parameterize.form.section "",
      (param for name, param of params)...

getModelParameters = safeExport 'morpheus.gui.getModelParameters', {}, (modelName) ->
  # Fetch model referenced by modelName parameters
  return wrapParams state.models[modelName].params if modelName? and state.models[modelName]?
  # Fetch all models' parameters
  params = {}
  for k,v of state.models
    params[k] = v.params
  return params

getModelArguments = safeExport 'morpheus.gui.getModelArguments', {}, (modelName) ->
  # Fetch model referenced by modelName arguments
  return state.models[modelName].args if modelName? and state.models[modelName]?
  # Fetch all models' arguments
  args = {}
  for k,v of state.models
    args[k] = v.args
  return args

# While morpheus.renderer provides a modelArguments method directly, this method allows morpheus.gui to keep track of changes to the scene script
# and automatically update default arguments for new or changed parameters in the script.
setModelArguments = safeExport 'morpheus.gui.setModelArguments', {}, (modelName, args) ->
  if not modelName?
    # Update all models in the hash
    for k,v of args
      model = state.models[k]
      if not model?
        throw "No model with the name '#{modelName}' exists in the scene."
      model.args = v
      morpheus.renderer.modelArguments k, model.args
    return
  # Update the model referenced by modelName
  model = state.models[modelName]
  if not model?
    throw "No model with the name '#{modelName}' exists in the scene."
  model.args = args
  morpheus.renderer.modelArguments modelName, model.args
  return

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

