# Optimization routines for reducing the abstract solid model

optimizeASM =
  intersect: (node) ->

    # Try to find a half-space "corner" (three halfspaces on x,y,z axes that intersect
    # Prefer a x+,y+,z+ corner first, then x-,y-,z- corner then all other corners
    # I.e.
    #
    # -  ____     and     +  |       respectively
    #   |                ____|     
    #   |  +                   -
  
    # Collect half-spaces into bins by type [x+, x-, y+, y-, z+, z-]
    # TODO: Possibly this code should be moved to the ASM compilation module...
    halfSpaceBins = []
    halfSpaceBins.push [] for i in [0..5]
    collectIntersectNodes node.nodes, flags, halfSpaceBins
    if halfSpaceBins[0].length > 0 and halfSpaceBins[1].length > 0 and halfSpaceBins[2].length > 0
      if halfSpaceBins[3].length > 0 and halfSpaceBins[4].length > 0 and halfSpaceBins[5].length > 0
        glslFunctions.corner = true
        boundaries = []
        boundaries.push (spaces.reduce (a,b) -> Math.max(a,b)) for spaces in halfSpaceBins[0..2]
        boundaries.push (spaces.reduce (a,b) -> Math.min(a,b)) for spaces in halfSpaceBins[3..5]
        center = [boundaries[0] + boundaries[3], boundaries[1] + boundaries[4], boundaries[2] + boundaries[5]]
        positionParam = "#{rayOrigin}"
        if center[0] != 0.0 or center[1] != 0.0 or center[2] != 0.0
          positionParam += " - vec3(#{center[0]},#{center[1]},#{center[2]})"
        glslCode = "#{glslLibrary.distanceFunctions.cornerDist.id}(abs(#{positionParam}), vec3(#{boundaries[3] - center[0]}, #{boundaries[4] - center[1]}, #{boundaries[5] - center[2]}))"

