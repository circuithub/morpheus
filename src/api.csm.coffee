# Application Programmer Interface for building solid models

# The result of any API operation is a Concrete Solid Model (CSM) passed along to a compiler (or to another API operation)
# Every API function is a variadic function that takes some attributes as its first argument and (optionally) a tail list of nodes to compose

do () ->

  # Internal utilities
  extend = (obj, mixin) ->
    for name, method of mixin
      obj[name] = method

  # API objects (fluent interface)
  class Chamferable
    chamfer: (amount) ->
      type: 'chamfer'
      attr:
        amount: amount
      nodes: [this]

  class IntersectNode
    constructor: (nodes) ->
      @nodes = nodes
      @type = 'intersect'

  extend IntersectNode.prototype, Chamferable

  # API functions
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
    nodes: nodes

  #window.chamfer = (nodes...) ->
  #  for node in nodes
  #    node.attr.chamfer = attr

  window.intersect = (nodes...) ->
    new IntersectNode nodes

  window.difference = (nodes...) ->
    type: 'difference'
    nodes: nodes

  window.box = (attr, nodes...) ->
    # Apply defaults
    if attr.chamfer?
      # Chamfer corners is on by default
      if not attr.chamfer.corners?
        attr.chamfer.corners = true
      # Chamfer all edges by default
      node.chamfer.edges = [0..11]
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

  window.translate = (attr, nodes...) ->
    type: 'translate'
    attr: attr
    nodes: nodes

