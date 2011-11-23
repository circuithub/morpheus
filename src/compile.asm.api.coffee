# The ASM builder API

asm =
  union: (nodes...) -> 
    type: 'union'
    nodes: nodes.flatten()
  intersect: (nodes...) -> 
    flattenedNodes = nodes.flatten()
    result =
      type: 'intersect'
      nodes: (n for n in flattenedNodes when n.type != 'intersect')
    result.nodes = result.nodes.concat n.nodes for n in flattenedNodes when n.type == 'intersect'
    return result
  #difference: (attr, nodes...) -> 
  #  type: 'difference'
  #  attr: attr
  #  nodes: nodes
  invert: (nodes...) ->
    type: 'invert'
    nodes: nodes.flatten()
  mirror: (attr, nodes...) ->
    type: 'mirror'
    attr: attr
    nodes: nodes.flatten()
  translate:  (attr, nodes...) ->
    type: 'translate'
    attr: attr
    nodes: nodes.flatten()
  material:  (attr, nodes...) ->
    type: 'material'
    attr: attr
    nodes: nodes.flatten()
  halfspace: (attr) ->
    type: 'halfspace'
    attr: attr
  cylinder: (attr) ->
    type: 'cylinder'
    attr: attr
  sphere: (attr) ->
    type: 'sphere'
    attr: attr

