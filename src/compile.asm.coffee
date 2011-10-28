# Compile the concrete solid model into a abstract solid model

# TODO: Would be nice if CoffeeScript supported these syntaxes:
# asm.intersect halfplanes[0..2]..., asm.invert halfplanes[3..6]...
# halfplanes[1,2,4,5]...

compileASM = (concreteSolidModel) ->
  asm =
    union: (nodes...) -> 
      type: 'union'
      nodes: nodes.flatten()
    intersect: (attr, nodes...) -> 
      type: 'intersect'
      attr: attr
      nodes: nodes.flatten()
    invert: (nodes...) ->
      type: 'invert'
      nodes: nodes.flatten()
    halfplane: (attr, nodes...) ->
      type: 'halfplane'
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
      halfPlanes = [
        asm.halfplane 
          val: -node.attr.dimensions[0]
          axis: 0
        asm.halfplane
          val: -node.attr.dimensions[1]
          axis: 1
        asm.halfplane
          val: -node.attr.dimensions[2]
          axis: 2
        asm.halfplane 
          val: node.attr.dimensions[0]
          axis: 0
        asm.halfplane 
          val: node.attr.dimensions[1]
          axis: 1
        asm.halfplane 
          val: node.attr.dimensions[2]
          axis: 2
      ]
      if node.attr.chamfer?
        node.attr.chamfer.edges.reduce (result,current) -> result + Math.pow 2, current
        ALL_EDGES = (Math.pow 2, 12) - 1
        if chamferEdges == ALL_EDGES 
          if node.attr.chamfer.corners
            # Chamfer everything
            asm.intersect { chamfer: true }, halfplanes[0], halfplanes[1], halfplanes[2], asm.invert halfplanes[3..6]...
          else 
            # Chamfer only edges (TODO: is this going to work as expected?)
            asm.intersect (
              { chamfer: true }
              asm.intersect { chamfer: true }, halfplanes[0], halfplanes[1], (asm.invert halfplanes[3], halfplanes[4])
              halfplanes[2]
              asm.invert halfplanes[5] )
        else
          # Group intersections according to the edges that are chamfered
          # TODO: This is not yet implemented, for now chamfer nothing...
          asm.intersect (
            {}
            halfplanes[0]
            halfplanes[1]
            halfplanes[2]
            asm.invert halfplanes[3..6]... )
      else
        asm.intersect (
          {}
          halfplanes[0]
          halfplanes[1]
          halfplanes[2]
          asm.invert halfplanes[3..6]... )
    sphere: (node) ->
      # TODO
      {}
    cylinder: (node) ->
      # TODO
      {}

  compileASMNode = (node) ->
    switch typeof node
      when 'object'
        if node.type in dispatch
          return dispatch[node.type] node
        else
          mecha.log "Unexpected node type '#{node.type}'."
          return {}
      else
        mecha.log "Unexpected node of type '#{typeof node}'."
        return {}
  if concreteSolidModel.type != 'scene'
    mecha.log "Expected node of type 'scene' at the root of the solid model"
    return
  
  compileASMNode concreteSolidModel
  
