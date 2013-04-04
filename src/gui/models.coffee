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
    params[k] = wrapParams v.params
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
  
  # ###
  # TEMPORARY: Scale parameters for CircuitHub
  globalScale = 0.1
  # Helper to get the id of a wrapped parameter
  _unwrap = (data) -> switch data._tag
    when 'tolerance', 'range' then data[0] # unwrap tolerance/range tags
    else data
  dimensionType = 
    real: true
    dimension1: true
    dimension2: true
    dimension3: true
    vector2: true
    vector3: true
    point2: true
    point3: true
    pitch1: true
    pitch2: true
    pitch3: true
    angle: false
    polar: false
    cylindrical: undefined # TODO...
    spherical: undefined # TODO...
    integer: false
    natural: false
    latice1: false
    latice2: false
    latice3: false
    boolean: false
    option: false
  _scaleArgument = (arg, param) ->
    tag = (_unwrap param)._tag
    if not dimensionType[tag]?
      throw "Parameter type #{tag} is not yet supported."
    if not dimensionType[(_unwrap param)._tag]
      return arg
    if Array.isArray arg
      return (a * globalScale for a in arg) 
    else if typeof arg == 'object'
      if not arg.min && arg.max
        throw "Could not find min and max keys for toleranced argument."
      if Array.isArray arg.min
        return { min: (a * globalScale for a in arg.min), max: (a * globalScale for a in arg.max) }
      else
        return { min: arg.min * globalScale, max: arg.max * globalScale }
    return arg * globalScale
  # ###

  # Helper used to render a model and update its arguments
  _render = (model, args) ->
    # Build a map from script ids to parameter ids
    paramToUniform = {}
    if model.params? then for uniformID,param of model.params
      [id] = _unwrap param
      paramToUniform[id] = uniformID
    # Scale arguments
    newArgs = {}
    for k,arg of args
      newArgs[k] = _scaleArgument arg, model.params[paramToUniform[k]]
    # Render model
    morpheus.renderer.modelArguments modelName, newArgs, model.params
  
  if not modelName?
    # Update all models in the hash
    for k,v of args
      model = state.models[k]
      if not model?
        throw "No model with the name '#{modelName}' exists in the scene."
      _render model, v
    return
  # Update the model referenced by modelName
  model = state.models[modelName]
  if not model?
    throw "No model with the name '#{modelName}' exists in the scene."
  _render model, args
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

