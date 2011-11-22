# Compile the concrete solid model into a abstract solid model

# TODO: Would be nice if CoffeeScript supported these syntaxes:
# asm.intersect halfplanes[0..2]..., asm.invert halfplanes[3..6]...
# halfplanes[1,2,4,5]...

# TODO: Some of these list comprehensions aren't as efficient as they could be, but for now we prefer clarity over speed
#       We'll optimize if it turns out that there's bottleneck here

compileASM = (concreteSolidModel) ->
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
          val: node.attr.dimensions[0] * -0.5
          axis: 0
        asm.halfspace
          val: node.attr.dimensions[1] * -0.5
          axis: 1
        asm.halfspace
          val: node.attr.dimensions[2] * -0.5
          axis: 2
        asm.halfspace 
          val: node.attr.dimensions[0] * 0.5
          axis: 0
        asm.halfspace 
          val: node.attr.dimensions[1] * 0.5
          axis: 1
        asm.halfspace 
          val: node.attr.dimensions[2] * 0.5
          axis: 2
      ]
      # TODO: Implement chamfer
      #if node.attr.chamfer?
      #  node.attr.chamfer.edges.reduce (result,current) -> result + Math.pow 2, current
      #  ALL_EDGES = (Math.pow 2, 12) - 1
      #  if chamferEdges == ALL_EDGES 
      #    if node.attr.chamfer.corners
      #      # Chamfer everything
      #      asm.intersect halfspaces[0], halfspaces[1], halfspaces[2], asm.invert halfspaces[3..6]...
      #    else 
      #      # Chamfer only edges (TODO: is this going to work as expected?)
      #      asm.intersect asm.intersect halfspaces[0], halfspaces[1], (asm.invert halfspaces[3], halfspaces[4]),
      #        halfspaces[2], asm.invert halfspaces[5]
      #  else
      #    # Group intersections according to the edges that are chamfered
      #    # TODO: This is not yet implemented, for now chamfer nothing...
      #    asm.intersect halfspaces[0], halfspaces[1], halfspaces[2], asm.invert halfspaces[3..6]...
      #else
      #  asm.intersect halfspaces[0], halfspaces[1], halfspaces[2], asm.invert halfspaces[3..6]...
      asm.intersect halfspaces[0], halfspaces[1], halfspaces[2], asm.invert halfspaces[3..6]...
    sphere: (node) ->
      asm.sphere { radius: node.attr.radius }
    cylinder: (node) ->
      halfspaces = [
        asm.halfspace 
          val: node.attr.length * -0.5
          axis: node.attr.axis
        asm.invert asm.halfspace
          val: node.attr.length * 0.5
          axis: node.attr.axis
      ]
      asm.intersect (asm.cylinder { radius: node.attr.radius, axis: node.attr.axis }), halfspaces[0], halfspaces[1]
    intersect: (node) ->
      asm.intersect (compileASMNode n for n in node.nodes)...
    union: (node) ->
      asm.union (compileASMNode n for n in node.nodes)...
    difference: (node) ->
      if node.nodes.length > 0
        asm.intersect compileASMNode node.nodes[0], asm.invert (compileASMNode n for n in node.nodes[1..node.nodes.length])...
      else
        asm.intersect()
    translate: (node) ->
      asm.translate node.attr, (compileASMNode n for n in node.nodes)...

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
  
  optimizeASM compileASMNode concreteSolidModel
  
