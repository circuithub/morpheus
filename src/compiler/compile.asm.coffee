# Compile the concrete solid model into a abstract solid model

# TODO: Would be nice if CoffeeScript supported these syntaxes:
# asm.intersect halfplanes[0..2]..., asm.invert halfplanes[3..6]...
# halfplanes[1,2,4,5]...

# TODO: Some of these list comprehensions aren't as efficient as they could be, but for now we prefer clarity over speed
#       We'll optimize if it turns out that there's bottleneck here

compileASM = (concreteSolidModel) ->
  if not concreteSolidModel?
    return null
  
  dispatch = 
    scene: (node) ->
      if node.nodes.length > 1
        asm.union (compileASMNode n for n in node.nodes)...
      else if node.nodes.length == 1
        compileASMNode node.nodes[0]
      else 
        {}
    box: (node) ->
      ###
      if Array.isArray node.attr.dimensions
        halfspaces = for i in [0..2]
          asm.halfspace 
            val: glsl.mul (glsl.index node.attr.dimensions, i), 0.5
            axis: i
        asm.mirror { axes: [0,1,2] }, asm.intersect halfspaces[0], halfspaces[1], halfspaces[2]
      ###
        
      # TODO: For now we always use a corner because the halfspace optimization code needs refactoring
      asm.intersect (asm.mirror { axes: [0,1,2] }, asm.corner { val: (glsl.mul node.attr.dimensions, 0.5) })

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
    sphere: (node) ->
      asm.sphere { radius: node.attr.radius }
    cylinder: (node) ->
      if node.attr.length?
        halfspaces = [
          asm.halfspace 
            val: node.attr.length * 0.5
            axis: node.attr.axis
          asm.invert asm.halfspace
            val: node.attr.length * -0.5
            axis: node.attr.axis
        ]
        asm.intersect (asm.cylinder { radius: node.attr.radius, axis: node.attr.axis }), halfspaces[0], halfspaces[1]
      else
        asm.cylinder { radius: node.attr.radius, axis: node.attr.axis }
    intersect: (node) ->
      asm.intersect (compileASMNode n for n in node.nodes)...
    union: (node) ->
      asm.union (compileASMNode n for n in node.nodes)...
    difference: (node) ->
      if node.nodes.length > 0
        asm.intersect (compileASMNode node.nodes[0]), asm.invert (compileASMNode n for n in node.nodes[1...node.nodes.length])...
      else
        node
    mirror: (node) ->
      asm.mirror node.attr, (compileASMNode n for n in node.nodes)...
    repeat: (node) -> 
      asm.repeat node.attr, (compileASMNode n for n in node.nodes)...
    translate: (node) ->
      asm.translate node.attr, (compileASMNode n for n in node.nodes)...
    rotate: (node) ->
      asm.rotate node.attr, (compileASMNode n for n in node.nodes)...
    scale: (node) ->
      asm.scale node.attr, (compileASMNode n for n in node.nodes)...
    material: (node) ->
      asm.material node.attr, (compileASMNode n for n in node.nodes)...
    chamfer: (node) ->
      #nodes = (compileASMNode n for n in node.nodes)
      #if nodes.length == 1 and (nodes[0].type == 'intersect' or nodes[0].type == 'union')
      #  # Put the chamfer node *below* any composite node
      #  node = asm.chamfer node.attr, nodes[0].nodes...
      #  nodes[0].nodes = [node]
      #  nodes[0]
      #else
      #  asm.chamfer node.attr, nodes...
      asm.chamfer node.attr, (compileASMNode n for n in node.nodes)...
    bevel: (node) ->
      #nodes = (compileASMNode n for n in node.nodes)
      #if nodes.length == 1 and (nodes[0].type == 'intersect' or nodes[0].type == 'union')
      #  # Put the chamfer node *below* any composite node
      #  node = asm.bevel node.attr, nodes[0].nodes...
      #  nodes[0].nodes = [node]
      #  nodes[0]
      #else
      #  asm.bevel node.attr, nodes...
      asm.bevel node.attr, (compileASMNode n for n in node.nodes)...
    wedge: (node) ->
      # TODO: rotate halfspace nodes
      halfSpaceAxis = if node.attr.axis + 1 > 2 then 0 else node.attr.axis + 1
      asm.intersect (asm.rotate { axis: node.attr.axis, angle: node.attr.from },
          (asm.halfspace { val: 0.0, axis: halfSpaceAxis })), 
        (asm.rotate { axis: node.attr.axis, angle: node.attr.to },
          (asm.invert asm.halfspace { val: 0.0, axis: halfSpaceAxis })),
        (compileASMNode n for n in node.nodes)...
    bend: (node) ->
      offset = if node.attr.offset? then node.attr.offset else 0
      (offsetVec = [0.0,0.0,0.0])[node.attr.offsetAxis] = offset
      direction = if node.attr.direction? then node.attr.direction else 1
      if not node.attr.radius? or node.attr.radius == 0
        asm.union (
          asm.intersect (compileASMNode n for n in node.nodes)...,
            if direction == 1
              asm.translate { offset: offsetVec },
                asm.rotate { axis: node.attr.axis, angle: (glsl.mul 0.5, node.attr.angle) }, 
                  asm.halfspace { val: 0.0, axis: node.attr.offsetAxis }
            else
              asm.invert asm.translate { offset: offsetVec },
                asm.rotate { axis: node.attr.axis, angle: node.attr.angle },
                  asm.halfspace { val: 0.0, axis: node.attr.axis }
        ),(
          asm.intersect (
            asm.translate { offset: offsetVec },
              asm.rotate { axis: node.attr.axis, angle: node.attr.angle },
                (compileASMNode n for n in node.nodes)...
          ),(
            asm.invert asm.translate { offset: offsetVec },
              asm.rotate { axis: node.attr.axis, angle: (glsl.mul 0.5, node.attr.angle) }, 
                asm.halfspace { val: 0.0, axis: node.attr.offsetAxis }
          )
        )
      else
        # Generate a smooth bend
        # TODO: For glsl shader generation it is better to use bitwise operators
        # upAxis = (7 & (~((1 << node.attr.offsetAxis) | (1 << node.attr.axis)))) >> 1
        upAxis = switch node.attr.offsetAxis
          when 0 then (if node.attr.axis == 2 then 1 else 2)
          when 1 then (if node.attr.axis == 2 then 0 else 2)
          when 2 then (if node.attr.axis == 1 then 0 else 1)
        (radiusVec = [0.0,0.0,0.0])[upAxis] = -node.attr.radius
        asm.union (
          asm.intersect (compileASMNode n for n in node.nodes)...,
            if direction == 1
              asm.halfspace { val: offset, axis: node.attr.offsetAxis }
            else
              asm.invert asm.translate { offset: offsetVec },
                asm.rotate { axis: node.attr.axis, angle: node.attr.angle },
                  asm.halfspace { val: 0.0, axis: node.attr.axis }
        ),(
          asm.intersect (
            asm.translate { offset: glsl.sub offsetVec, radiusVec },
              asm.rotate { axis: node.attr.axis, angle: node.attr.angle },
                asm.translate { offset: radiusVec },
                  (compileASMNode n for n in node.nodes)...
          ),(
            asm.invert asm.translate { offset: offsetVec },
              asm.rotate { axis: node.attr.axis, angle: node.attr.angle }, 
                asm.halfspace { val: 0.0, axis: node.attr.offsetAxis }
          )
        )

  compileASMNode = (node) ->
    switch typeof node
      when 'object'
        if dispatch[node.type]?
          return dispatch[node.type] node
        else
          mecha.logInternalError "Unexpected node type '#{node.type}'."
          return {}
      else
        mecha.logInternalError "Unexpected node of type '#{typeof node}'."
        return {}
  if concreteSolidModel.type != 'scene'
    mecha.logInternalError "Expected node of type 'scene' at the root of the solid model, instead, got '#{concreteSolidModel.type}'."
    return null
  
  return optimizeASM compileASMNode concreteSolidModel

