# Application Programmer Interface for building solid models

# The result of any API operation is a Concrete Solid Model (CSM) passed along to a compiler (or to another API operation)
# Every API function is a variadic function that takes some attributes as its first argument and (optionally) a tail list of nodes to compose


do () ->
  #_csmModel = []
  window.scene = (nodes...) ->
    #_csmModel = arguments
    #clone = (obj) ->
    #  if obj == null || typeof obj != 'object'
    #    return obj
    #  temp = new obj.constructor()
    #  for key in obj
    #    temp[key] = clone obj[key]
    #  return temp
    #clone _csmModel
    type: 'scene'
    nodes: nodes
  
  window.union = (attr, nodes...) ->
      type: 'union'
      attr: attr
      nodes: nodes

  window.intersect = (attr, nodes...) ->
      type: 'intersect'
      attr: attr
      nodes: nodes

  window.difference = (attr, nodes...) ->
      type: 'difference'
      attr: attr
      nodes: nodes

  window.box = (attr, nodes...) ->
      type: 'box'
      attr: attr
      nodes: nodes

  window.cylinder = (attr, nodes...) ->
      type: 'cylinder'
      attr: attr
      nodes: nodes

  window.sphere = (attr, nodes...) ->
      type: 'sphere'
      attr: attr
      nodes: nodes

