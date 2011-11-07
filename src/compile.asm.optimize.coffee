# Static analysis / optimization routines for reducing the abstract solid model

optimizeASM = (node, flags) ->
  resultNode = {}
  if not flags?
    flags = { invert: false }
  
  if node.type == 'intersect'
    # TODO: Flatten intersect nodes?

    # Collect half-spaces into bins by type [x+, x-, y+, y-, z+, z-]
    halfSpaceBins = []
    halfSpaceBins.push [] for i in [0..5]
    collectASM.intersect node.nodes, flags, halfSpaceBins
  
    # Remove redundant half-spaces from the node
    boundaries = []
    boundaries.push (spaces.reduce (a,b) -> Math.max(a,b)) for spaces in halfSpaceBins[0..2]
    boundaries.push (spaces.reduce (a,b) -> Math.min(a,b)) for spaces in halfSpaceBins[3..5]

    #filterHalfSpaces = (nodes, flags, boundaries) ->
    #   for node in nodes
    #     resultNode = null
    #     switch node.type
    #       when 'halfspace'
    #         resultNode = node if boundaries[node.attr.axis + (if flags.invert then 3 else 0)] == node.attr.val
    #       when 'intersect' 
    #         mecha.logInternalError "ASM Optimize: Intersect nodes should not be directly nested expected intersect nodes to be flattened ASM compiler."
    #       when 'invert'
    #         flags.invert = not flags.invert
    #         resultNode =
    #           type: 'invert'
    #           nodes: filterHalfSpaces node.nodes, flags, boundaries
    #         flags.invert = not flags.invert
    #         resultNode = null if resultNode.nodes.length == 0
    #       else
    #         mecha.logInternalError "ASM Optimize: Unsuppported node type, '#{node.type}', inside intersection."
    #     resultNodes.push resultNode if resultNode?
    #     ++i
    #  return resultNodes
    #intersectNodes = filterHalfSpaces node.nodes, flags, boundaries

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
  else
    mecha.logInternalError "ASM Optimize: Optimizing unsuppported node type, '#{node.type}'."

  return resultNode

