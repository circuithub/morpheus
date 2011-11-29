# Get the abstract solid model's bounding box in space (and possibly also its children's bounding boxes to get a bounding volume hierarchy)

compileASMBounds = (abstractSolidModel) ->
  dispatch = 
    scene: (node) ->
    sphere: (node) ->
    cylinder: (node) ->
    intersect: (node) ->
    union: (node) ->
    difference: (node) ->
    translate: (node) ->
    material: (node) ->

  compileASMNode = (node) ->
    switch typeof node
      when 'object'
        if dispatch[node.type]?
          return dispatch[node.type] node
        else
          mecha.log "Unexpected node type '#{node.type}'."
          return {}
      else
        mecha.log "Unexpected node of type '#{typeof node}'."
        return {}
  if abstractSolidModel.type != 'scene'
    mecha.log "Expected node of type 'scene' at the root of the solid model, instead, got '#{abstractSolidModel.type}'."
    return
  
  compileASMNode abstractSolidModel
  
