# The ASM builder API

asm =
  union: (nodes...) -> 
    type: 'union'
    nodes: flatten nodes
  intersect: (nodes...) -> 
    flattenedNodes = flatten nodes
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
    nodes: flatten nodes
  mirror: (attr, nodes...) ->
    type: 'mirror'
    attr: attr
    nodes: flatten nodes
  repeat: (attr, nodes...) ->
    type: 'repeat'
    attr: attr
    nodes: flatten nodes
  translate:  (attr, nodes...) ->
    type: 'translate'
    attr: attr
    nodes: flatten nodes
  rotate: (attr, nodes...) ->
    type: 'rotate'
    attr: attr
    nodes: flatten nodes
  scale: (attr, nodes...) ->
    type: 'scale'
    attr: attr
    nodes: flatten nodes
  material:  (attr, nodes...) ->
    type: 'material'
    attr: attr
    nodes: flatten nodes
  halfspace: (attr) ->
    type: 'halfspace'
    attr: attr
  corner: (attr) ->
    type: 'corner'
    attr: attr
  cylinder: (attr) ->
    type: 'cylinder'
    attr: attr
  sphere: (attr) ->
    type: 'sphere'
    attr: attr
  chamfer: (attr, nodes...) ->
    type: 'chamfer'
    attr: attr
    nodes: flatten nodes
  bevel: (attr, nodes...) ->
    type: 'bevel'
    attr: attr
    nodes: flatten nodes

