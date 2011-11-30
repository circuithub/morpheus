# Get the abstract solid model's bounding box in space (and possibly also its 
# children's bounding boxes to get a bounding volume hierarchy)
# Bounding boxes are axis aligned for now for simiplicity's sake

compileASMBounds = (abstractSolidModel) ->
  # Constants (enum)
  UNION = 0
  INTERSECT = 1

  preDispatch = 
    invert: (stack, node, flags) ->
      flags.invert = not flags.invert
    union: (stack, node, flags) ->
      flags.composition.push UNION
    intersect: (stack, node, flags) ->
      flags.composition.push INTERSECT
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
    if composition == UNION then unionChildren nodes else intersectChildren nodes
  
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
      node.bounds[0][i] += node.attr.offset[i] for i in [0..2]
      node.bounds[1][i] += node.attr.offset[i] for i in [0..2]
      stack[0].nodes.push node
    halfspace: (stack, node, flags) ->
      node.bounds = [[-Infinity, -Infinity, -Infinity], [Infinity, Infinity, Infinity]]
      node.bounds[if flags.invert then 0 else 1][node.attr.axis] = node.attr.val
      stack[0].nodes.push node
    cylinder: (stack, node, flags) ->
      node.bounds = [[-node.attr.radius, -node.attr.radius, -node.attr.radius], [node.attr.radius, node.attr.radius, node.attr.radius]]
      node.bounds[0][node.attr.axis] = -Infinity
      node.bounds[1][node.attr.axis] = Infinity
      stack[0].nodes.push node
    sphere: (stack, node, flags) ->
      node.bounds = [[-node.attr.radius, -node.attr.radius, -node.attr.radius], [node.attr.radius, node.attr.radius, node.attr.radius]]
      stack[0].nodes.push node
    default: (stack, node, flags) ->
      node.bounds = collectChildren node.nodes, flags
      stack[0].nodes.push node
  
  flags = 
    invert: false
    composition: [UNION]
  result = mapASM preDispatch, postDispatch, [{nodes: []}], abstractSolidModel, flags
  result.flags = flags
  result

