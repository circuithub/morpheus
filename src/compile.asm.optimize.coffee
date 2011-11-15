# Static analysis / optimization routines for reducing the abstract solid model

mapASM = (dispatch, stack, node, flags) ->
  stack.push { type: node.type, attr: node.attr }
  nodes = mapASM dispatch, stack, n, flags for n in node.nodes
  returnNode = stack.pop()
  dispatchMethod = node.type if dispatch[node.type]? else 'default'
  return dispatch[dispatchMethod] stack.reverse(), returnNode, nodes, flags

optimizeASM = (node, flags) ->
  resultNode = {}
  if not flags?
    flags = 
      invert: false
      translation: [0.0,0.0,0.0]

  # Optimization which trims empty nodes
  dispatchTrim = {}

  # Optimization which flattens duplicate nested nodes
  dispatchFlatten =
    union: (stack, node, nodes, flags) ->
      for s in stack
        switch s.type
          when 'union'
            s.nodes.concat nodes...
            return [] # Discard node
        break # Only run to depth of one
      node.nodes.concat nodes...
      return [node]
    intersect: (stack, node, nodes, flags) ->
      for s in stack
        switch s.type
          when 'intersect'
            s.nodes.concat nodes...
            return [] # Discard node
        break # Only run to depth of one
      node.nodes.concat nodes...
      return [node]
    #difference: (stack, node, nodes, flags) ->
    #  for s in stack
    #    switch s.type
    #      when 'difference'
    #        if nodes.length > 0
    #          if s.nodes.length == 0
    #            s.nodes.concat nodes...
    #          else
    #            if s.nodes[0].type == 'union'
    #              s.nodes[0].nodes.concat nodes[0]
    #            else
    #              s.nodes[0] = asm.union s.nodes[0], nodes[0]...
    #            if nodes.length > 1
    #              s.nodes.concat nodes[1..nodes.length]...
    #        return [] # Discard node
    #    break # Only run to depth of one
    #  node.nodes.concat nodes...
    #  return [node]
    translate: (stack, node, nodes, flags) ->
      # TODO
      #for s in stack
      #  switch s.type
      #    when 'translate'
      #      s.nodes.concat nodes...
      #      return [] # Discard node
      #  break # Only run to depth of one
      #node.nodes.concat nodes...
      #return [node]
      node.nodes.concat nodes...
      return [node]
    default: (stack, node, nodes, flags) ->
      node.nodes.concat nodes...
      return [node]
  
  dispatchCullSpaces =
    halfspace: (stack, node, nodes, flags) ->
      for s in stack
        switch s.type
          when 'intersect'
            #for n in s.nodes
              #if n.type == 'halfspace' and n.axis == node.axis
                #TODO: check - are we inverted? n.val = Math.max(n.val) 
            s.nodes.concat nodes...
            return [] # Discard node
        break # Only run to depth of one
      node.nodes.concat nodes...
      return [node]

    ###
    intersect: (node, flags) ->
      # Collect half-spaces into bins by type [x+, x-, y+, y-, z+, z-]
      halfSpaceBins = []
      halfSpaceBins.push [] for i in [0..5]
      collectASM.intersect node.nodes, flags, halfSpaceBins
    
      # Remove redundant half-spaces from the node
      boundaries = []
      boundaries.push (spaces.reduce (a,b) -> Math.max(a,b)) for spaces in halfSpaceBins[0..2]
      boundaries.push (spaces.reduce (a,b) -> Math.min(a,b)) for spaces in halfSpaceBins[3..5]

      # Detect symmetries inside the intersection (symmetrize)
      center = [boundaries[0] + boundaries[3], boundaries[1] + boundaries[4], boundaries[2] + boundaries[5]]
      mirrorAxes = (i for i in [0..2] when halfSpaceBins[i].length > 0 and halfSpaceBins[i + 3].length > 0)

      mirrorHalfSpaces = (asm.halfspace {val: boundaries[i] - center[i], axis: i} for i in mirrorAxes)
      posHalfSpaces = (asm.halfspace {val: boundaries[i] - center[i], axis: i} for i in [0..2] when halfSpaceBins[i].length > 0 and halfSpaceBins[i + 3].length == 0)
      negHalfSpaces = (asm.halfspace {val: boundaries[i] - center[i-3], axis: i-3} for i in [3..5] when halfSpaceBins[i].length > 0 and halfSpaceBins[i-3].length == 0)

      mirrorNode = (asm.mirror {axes: mirrorAxes, duplicate: true}, mirrorHalfSpaces...) if mirrorHalfSpaces.length > 0
      posNode = asm.intersect posHalfSpaces... if posHalfSpaces.length > 0
      negNode = asm.invert negHalfSpaces... if negHalfSpaces.length > 0

      intersectNodes = []
      intersectNodes.push mirrorNode if mirrorNode? 
      intersectNodes.push posNode if posNode?
      intersectNodes.push negNode if negNode?
      #TODO: intersectNodes.push # other types of nodes... (cylinders, spheres etc)

      intersectNode = 
        if intersectNodes.length == 1 and intersectNodes[0].type == 'intersect'
          intersectNodes[0]
        else if intersectNodes.length > 0
          type: 'intersect'
          nodes: intersectNodes
        else
          undefined

      resultNode = 
        if center[0] == 0 and center[1] == 0 and center[2] == 0
          intersectNode
        else if intersectNode?
          type: 'translate'
          attr: 
            position: center
          nodes: [intersectNode]
        else
          undefined
    ###
  return resultNode

