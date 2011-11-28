# Compile the GLSL distance function
glslDistanceCompiler = (minCallback, maxCallback) ->
  rayOrigin = 'ro'
  preDispatch = 
    invert: (stack, node, flags) ->
      flags.invert = not flags.invert
    intersect: (stack, node, flags) ->
      node.halfSpaces = []
      node.halfSpaces.push null for i in [0..5]
    union: (stack, node, flags) ->
      node.halfSpaces = []
      node.halfSpaces.push null for i in [0..5]
    translate: (stack, node, flags) ->
      # Push the modified ray origin onto the prelude stack
      ro = flags.glslPrelude[flags.glslPrelude.length-1][0] # Current ray origin
      glslCompiler.preludePush flags.glslPrelude, "#{ro} - vec3(#{node.attr.offset[0]}, #{node.attr.offset[1]}, #{node.attr.offset[2]})"
    default: (stack, node, flags) ->
      return

  # Compile a single corner
  compileCorner = (ro, flags, state) ->
    remainingHalfSpaces = 0
    remainingHalfSpaces += 1 for h in state.hs when h != null
    if remainingHalfSpaces == 1
      # Find the axis (from 0 to 5) for the halfSpace node
      for index in [0..5] when state.hs[index] != null
        state.codes.push (if index > 2 then "#{ro}[#{index - 3}] - #{state.hs[index]}" else "-#{ro}[#{index}] + #{state.hs[index]}")
        state.hs[index] = null
        break
      remainingHalfSpaces -= 1
    else if remainingHalfSpaces > 1
      cornerSize = [
        if state.hs[0] != null then state.hs[0] else if state.hs[3] != null then state.hs[3] else 0,
        if state.hs[1] != null then state.hs[1] else if state.hs[4] != null then state.hs[4] else 0,
        if state.hs[2] != null then state.hs[2] else if state.hs[5] != null then state.hs[5] else 0]
      signs = [
        state.hs[0] != null,
        state.hs[1] != null,
        state.hs[2] != null]
      roWithSigns = 
        if not (signs[0] or signs[1] or signs[2])
          "#{ro}"
        else if (signs[0] or state.hs[3] == null) and (signs[1] or state.hs[4] == null) and (signs[2] or state.hs[5] == null)
          "-#{ro}"
        else
          "vec3(#{if signs[0] then '-' else ''}#{ro}.x, #{if signs[1] then '-' else ''}#{ro}.y, #{if signs[2] then '-' else ''}#{ro}.z"
      cornerWithSigns = "vec3(#{if signs[0] then -cornerSize[0] else cornerSize[0]}, #{if signs[1] then -cornerSize[1] else cornerSize[1]}, #{if signs[2] then -cornerSize[2] else cornerSize[2]})"
      glslCompiler.preludePush flags.glslPrelude, "#{roWithSigns} - #{cornerWithSigns}"
      dist = glslCompiler.preludePop flags.glslPrelude
      if state.hs[0] != null or state.hs[3] != null
        state.codes.push "#{dist}.x" 
        if state.hs[0] != null then state.hs[0] = null else state.hs[3] = null
        remainingHalfSpaces -= 1
      if state.hs[1] != null or state.hs[4] != null
        state.codes.push "#{dist}.y" 
        if state.hs[1] != null then state.hs[1] = null else state.hs[4] = null
        remainingHalfSpaces -= 1
      if state.hs[2] != null or state.hs[5] != null
        state.codes.push "#{dist}.z" 
        if state.hs[2] != null then state.hs[2] = null else state.hs[5] = null
        remainingHalfSpaces -= 1
    return
  
  postDispatch =
    invert: (stack, node, flags) ->
      flags.invert = not flags.invert
    union: (stack, node, flags) ->
      # Check that composite node is not empty
      if node.nodes.length == 0
        mecha.logInternalError "GLSL Compiler: Union node is empty."
        return
      codes = []

      # Collect the source code for all the child nodes
      # Some nodes are only modifiers, so it's necessary to collect their children 
      # to apply the correct composite operation
      collectCode = (codes, nodes) -> 
        for node in nodes
          codes.push node.code if node.code?
          switch node.type
            when 'translate','mirror','invert','material'
              collectCode codes, node.nodes
      collectCode codes, node.nodes

      # Corner compilation
      ro = flags.glslPrelude[flags.glslPrelude.length-1][0] # Current ray origin
      cornersState = 
        codes: []
        hs: node.halfSpaces.shallowClone()

      # Compile the first and a possible second corner
      compileCorner ro, flags, cornersState
      compileCorner ro, flags, cornersState
      codes = codes.concat cornersState.codes

      # Post-condition: All halfspaces must be accounted for
      for h in cornersState.hs when h != null
        mecha.logInternalError "GLSL Compiler: Post-condition failed, some half spaces were not processed during corner compilation."
        break

      # Calculate the maximum distances
      node.code = codes.shift()
      for c in codes
        node.code = minCallback c, node.code, flags.glslPrelude
      stack[0].nodes.push node
    intersect: (stack, node, flags) ->
      # Check that composite node is not empty
      if node.nodes.length == 0
        mecha.logInternalError "GLSL Compiler: Intersect node is empty."
        return
      
      # Collect the source code for all the child nodes
      # Some nodes are only modifiers, so it's necessary to collect their children 
      # to apply the correct composite operation
      codes = []
      collectCode = (codes, nodes) -> 
        for node in nodes
          codes.push node.code if node.code?
          switch node.type
            when 'translate','mirror','invert','material'
              collectCode codes, node.nodes
      collectCode codes, node.nodes

      # Corner compilation
      ro = flags.glslPrelude[flags.glslPrelude.length-1][0] # Current ray origin
      cornersState = 
        codes: []
        hs: node.halfSpaces.shallowClone()

      # Compile the first and a possible second corner
      compileCorner ro, flags, cornersState
      compileCorner ro, flags, cornersState
      codes = codes.concat cornersState.codes

      # Post-condition: All halfspaces must be accounted for
      for h in cornersState.hs when h != null
        mecha.logInternalError "GLSL Compiler: Post-condition failed, some half spaces were not processed during corner compilation."
        break

      # Calculate the maximum distances
      node.code = codes.shift()
      for c in codes
        node.code = maxCallback c, node.code, flags.glslPrelude
      stack[0].nodes.push node
    translate: (stack, node, flags) ->  
      # Remove the modified ray origin from the prelude stack
      glslCompiler.preludePop flags.glslPrelude
      # Check that composite node is not empty
      if node.nodes.length == 0
        mecha.logInternalError "GLSL Compiler: Translate node is empty."
        return
      stack[0].nodes.push node
    halfspace: (stack, node, flags) ->
      # Check that geometry node is empty
      if node.nodes.length != 0
        mecha.logInternalError "GLSL Compiler: Halfspace node is not empty."
        return
      translateOffset = 0.0
      for s in stack
        switch s.type
          when 'intersect'
            # Assign to the halfspace bins for corner compilation
            index = node.attr.axis + (if flags.invert then 3 else 0)
            val = node.attr.val + translateOffset
            if s.halfSpaces[index] == null or (index < 3 and val > s.halfSpaces[index]) or (index > 2 and val < s.halfSpaces[index])
              s.halfSpaces[index] = val
          when 'union'
            # Assign to the halfspace bins for corner compilation
            index = node.attr.axis + (if flags.invert then 3 else 0)
            val = node.attr.val + translateOffset
            if s.halfSpaces[index] == null or (index < 3 and val < s.halfSpaces[index]) or (index > 2 and val > s.halfSpaces[index])
              s.halfSpaces[index] = val
          when 'translate'
            translateOffset += s.attr.offset[node.attr.axis]
            continue # Search for preceding intersect/union node 
          when 'invert', 'mirror'
            continue # Search for preceding intersect/union node
          else
            # This may occur in special cases where we cannot do normal corner compilation
            # (Such as a separate transformations on the plane itself)
            ro = flags.glslPrelude[flags.glslPrelude.length-1][0] # Current ray origin
            node.code = "#{node.attr.val} - #{ro}[#{node.attr.axis}]"
        break
      stack[0].nodes.push node
    cylinder: (stack, node, flags) ->
      ro = flags.glslPrelude[flags.glslPrelude.length-1][0] # Current ray origin
      planeCoords = ['yz','xz','xy'][node.attr.axis]
      node.code = "length(#{ro}.#{planeCoords}) - #{node.attr.radius}"
      stack[0].nodes.push node
    sphere: (stack, node, flags) ->
      ro = flags.glslPrelude[flags.glslPrelude.length-1][0] # Current ray origin
      node.code = "length(#{ro}) - #{node.attr.radius}"
      stack[0].nodes.push node
    default: (stack, node, flags) ->
      stack[0].nodes.push node
  
  return ((abstractSolidModel) -> glslCompiler abstractSolidModel, preDispatch, postDispatch)

glslDistance = glslDistanceCompiler ((a,b) -> "min(#{a}, #{b})"), ((a,b) -> "max(#{a}, #{b})")

