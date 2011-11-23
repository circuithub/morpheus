# Application Programmer Interface for building solid models

# The result of any API operation is a Concrete Solid Model (CSM) passed along to a compiler (or to another API operation)
# Every API function is a variadic function that takes some attributes as its first argument and (optionally) a tail list of nodes to compose

do () ->

  # Internal utilities
  extend = (obj, mixin) ->
    for name, method of mixin
      obj[name] = method
    return obj

  # Fluid API builder
  dispatch = {}
  
  Api = (f) ->
    return () -> 
      obj = extend (Object.create dispatch), (f arguments...)
      obj.nodes.unshift this if this?
      return obj

  # API dispatcher
  extend dispatch,
    union: Api (attr, nodes...) ->
      type: 'union'
      nodes: nodes
    intersect: Api (nodes...) ->
      type: 'intersect'
      nodes: nodes
    difference: Api (nodes...) ->
      type: 'difference'
      nodes: nodes
    box: Api (attr, nodes...) ->
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
    cylinder: Api (attr, nodes...) ->
      type: 'cylinder'
      attr: attr
      nodes: nodes
    sphere: Api (attr, nodes...) ->
      type: 'sphere'
      attr: attr
      nodes: nodes
    translate: Api (attr, nodes...) ->
      type: 'translate'
      attr: attr
      nodes: nodes
    material: Api (attr, nodes...) ->
      type: 'material'
      attr: attr
      nodes: nodes

  # Put API functions into the global namespace
  window.scene = (nodes...) ->
    strip = (nodes) ->
      { type: n.type, attr: n.attr, nodes: strip n.nodes } for n in nodes
    type: 'scene'
    nodes: strip nodes

  extend window, dispatch

