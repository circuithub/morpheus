# Compile the concrete solid model into a abstract solid model

# TODO: Would be nice if CoffeeScript supported these syntaxes:
# asm.intersect halfplanes[0..2]..., asm.invert halfplanes[3..6]...
# halfplanes[1,2,4,5]...

# TODO: Some of these list comprehensions aren't as efficient as they could be, but for now we prefer clarity over speed
#       We'll optimize if it turns out that there's bottleneck here

compileASM = (concreteSolidModel) ->
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
    difference: (attr, nodes...) -> 
      type: 'difference'
      attr: attr
      nodes: nodes
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
    halfspace: (attr) ->
      type: 'halfspace'
      attr: attr

  dispatch = 
    scene: (node) ->
      if node.nodes.length > 1
        asm.union (compileASMNode n for n in node.nodes)...
      else if node.nodes.length == 1
        compileASMNode node.nodes[0]
      else 
        {}
    box: (node) ->
      halfspaces = [
        asm.halfspace 
          val: -node.attr.dimensions[0]
          axis: 0
        asm.halfspace
          val: -node.attr.dimensions[1]
          axis: 1
        asm.halfspace
          val: -node.attr.dimensions[2]
          axis: 2
        asm.halfspace 
          val: node.attr.dimensions[0]
          axis: 0
        asm.halfspace 
          val: node.attr.dimensions[1]
          axis: 1
        asm.halfspace 
          val: node.attr.dimensions[2]
          axis: 2
      ]
      if node.attr.chamfer?
        node.attr.chamfer.edges.reduce (result,current) -> result + Math.pow 2, current
        ALL_EDGES = (Math.pow 2, 12) - 1
        if chamferEdges == ALL_EDGES 
          if node.attr.chamfer.corners
            # Chamfer everything
            asm.intersect halfspaces[0], halfspaces[1], halfspaces[2], asm.invert halfspaces[3..6]...
          else 
            # Chamfer only edges (TODO: is this going to work as expected?)
            asm.intersect asm.intersect halfspaces[0], halfspaces[1], (asm.invert halfspaces[3], halfspaces[4]),
              halfspaces[2], asm.invert halfspaces[5]
        else
          # Group intersections according to the edges that are chamfered
          # TODO: This is not yet implemented, for now chamfer nothing...
          asm.intersect halfspaces[0], halfspaces[1], halfspaces[2], asm.invert halfspaces[3..6]...
      else
        asm.intersect halfspaces[0], halfspaces[1], halfspaces[2], asm.invert halfspaces[3..6]...
    sphere: (node) ->
      # TODO
      {}
    cylinder: (node) ->
      # TODO
      {}
    intersect: (node) ->
      asm.intersect (compileASMNode n for n in node.nodes)...
    union: (node) ->
      asm.union (compileASMNode n for n in node.nodes)...
    difference: (node) ->
      asm.difference (compileASMNode n for n in node.nodes)...

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
  if concreteSolidModel.type != 'scene'
    mecha.log "Expected node of type 'scene' at the root of the solid model, instead, got '#{concreteSolidModel.type}'."
    return
  
  compileASMNode concreteSolidModel
  
