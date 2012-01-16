# Get the abstract solid model's bounding box in space (and possibly also its 
# children's bounding boxes to get a bounding volume hierarchy)
# Bounding boxes are axis aligned for now for simiplicity's sake

compileASMBounds = (abstractSolidModel) ->
  # Constants (enum)
  COMPOSITION_UNION = 0
  COMPOSITION_INTERSECT = 1

  preDispatch = 
    invert: (stack, node, flags) ->
      flags.invert = not flags.invert
    union: (stack, node, flags) ->
      flags.composition.push COMPOSITION_UNION
    intersect: (stack, node, flags) ->
      flags.composition.push COMPOSITION_INTERSECT
    default: (stack, node, flags) ->
      return
  
  unionChildren = (nodes) ->
    bounds = [[Infinity, Infinity, Infinity], [-Infinity, -Infinity, -Infinity]]
    for n in nodes
      bounds[0][i] = Math.min n.bounds[0][i], bounds[0][i] for i in [0..2]
      bounds[1][i] = Math.max n.bounds[1][i], bounds[1][i] for i in [0..2]
    bounds

  intersectChildren = (nodes) ->
    bounds = [[-Infinity, -Infinity, -Infinity], [Infinity, Infinity, Infinity]]
    for n in nodes
      bounds[0][i] = Math.max n.bounds[0][i], bounds[0][i] for i in [0..2]
      bounds[1][i] = Math.min n.bounds[1][i], bounds[1][i] for i in [0..2]
    bounds

  collectChildren = (nodes, flags) ->
    composition = flags.composition[flags.composition.length - 1]
    if composition == COMPOSITION_UNION then unionChildren nodes else intersectChildren nodes
  
  postDispatch =
    invert: (stack, node, flags) ->
      node.bounds = collectChildren node.nodes, flags
      flags.invert = not flags.invert
      stack[0].nodes.push node
    union: (stack, node, flags) ->
      node.bounds = collectChildren node.nodes, flags
      flags.composition.pop()
      stack[0].nodes.push node
    intersect: (stack, node, flags) ->
      node.bounds = collectChildren node.nodes, flags
      flags.composition.pop()
      stack[0].nodes.push node
    translate: (stack, node, flags) ->
      node.bounds = collectChildren node.nodes, flags
      # TODO: handle node.attr.offset[..] != 'number'
      node.bounds[0][i] += node.attr.offset[i] for i in [0..2] when typeof node.attr.offset[i] == 'number'
      node.bounds[1][i] += node.attr.offset[i] for i in [0..2] when typeof node.attr.offset[i] == 'number'
      stack[0].nodes.push node
    rotate: (stack, node, flags) ->
      node.bounds = collectChildren node.nodes, flags
      # TODO...
      stack[0].nodes.push node
    scale: (stack, node, flags) ->
      node.bounds = collectChildren node.nodes, flags
      # TODO...
      stack[0].nodes.push node
    halfspace: (stack, node, flags) ->
      node.bounds = [[-Infinity, -Infinity, -Infinity], [Infinity, Infinity, Infinity]]
      if typeof node.attr.val == 'string'
        # TODO: Handle all parameter boundary combinations (might still not be 100% accurate in special cases...)
        # E.g. 
        #if flags.invert
        #  node.bounds[1][node.attr.axis] = evalParamMin node.attr.val
        #else
        #  node.bounds[0][node.attr.axis] = evalParamMax node.attr.val
      else
        node.bounds[if flags.invert then 1 else 0][node.attr.axis] = node.attr.val
      stack[0].nodes.push node
    cylinder: (stack, node, flags) ->
      if typeof node.attr.radius == 'number'
        node.bounds = [[-node.attr.radius, -node.attr.radius, -node.attr.radius], [node.attr.radius, node.attr.radius, node.attr.radius]]
        node.bounds[0][node.attr.axis] = -Infinity
        node.bounds[1][node.attr.axis] = Infinity
      else
        # TODO: use parameters to limit the dimensions
        node.bounds = [[-Infinity, -Infinity, -Infinity], [Infinity, Infinity, Infinity]]
      stack[0].nodes.push node
    sphere: (stack, node, flags) ->
      if typeof node.attr.radius  == 'number'
        node.bounds = [[-node.attr.radius, -node.attr.radius, -node.attr.radius], [node.attr.radius, node.attr.radius, node.attr.radius]]
      else
        node.bounds = [[-Infinity, -Infinity, -Infinity], [Infinity, Infinity, Infinity]]
      stack[0].nodes.push node
    default: (stack, node, flags) ->
      node.bounds = collectChildren node.nodes, flags
      stack[0].nodes.push node
  
  flags = 
    invert: false
    composition: [COMPOSITION_UNION]
  result = mapASM preDispatch, postDispatch, [{nodes: []}], abstractSolidModel, flags
  result.flags = flags
  result

