# Static analysis / optimization routines for reducing the abstract solid model

optimizeASM = do () ->
  intersect: (node, flags) ->
    # Collect half-spaces into bins by type [x+, x-, y+, y-, z+, z-]
    halfSpaceBins = []
    halfSpaceBins.push [] for i in [0..5]
    collectASM.intersect node.nodes, flags, halfSpaceBins
    boundaries = []
    boundaries.push (spaces.reduce (a,b) -> Math.max(a,b)) for spaces in halfSpaceBins[0..2]
    boundaries.push (spaces.reduce (a,b) -> Math.min(a,b)) for spaces in halfSpaceBins[3..5]

    # The resulting node    
    result = {}

    # Remove redundant half-spaces from the node
    filterHalfSpaces = (result, node, flags, boundaries) ->
      i = 0
      while i < nodes.length
        node = nodes[i]
        switch node.type
          when 'halfspace'
            if boundaries[node.attr.axis + (if flags.invert then 3 else 0)] != node.attr.val
              nodes.splice i, 1
              continue
          when 'intersect' 
            mecha.logInternalError "ASM Optimize: Intersect nodes should not be directly nested expected intersect nodes to be flattened ASM compiler."
          when 'invert'
            flags.invert = not flags.invert
            filterHalfSpaces node.nodes, flags, boundaries
            flags.invert = not flags.invert
            if node.nodes.length == 0
              nodes.splice i, 1
              continue
          else
            mecha.logInternalError "ASM Optimize: Unsuppported node type, '#{node.type}', inside intersection."
        ++i
    filterHalfSpaces result, node, flags, boundaries

    # Detect symmetries in the scene definition (symmetrize)
    center = [boundaries[0] + boundaries[3], boundaries[1] + boundaries[4], boundaries[2] + boundaries[5]]
    
