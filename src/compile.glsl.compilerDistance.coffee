# Compile the GLSL distance function
glslCompilerDistance = (primitiveCallback, minCallback, maxCallback) ->
  rayOrigin = 'ro'
  preDispatch = 
    invert: (stack, node, flags) ->
      flags.invert = not flags.invert
    union: (stack, node, flags) ->
      flags.composition.push glslCompiler.COMPOSITION_UNION
      node.halfSpaces = []
      node.halfSpaces.push null for i in [0..5]
    intersect: (stack, node, flags) ->
      flags.composition.push glslCompiler.COMPOSITION_INTERSECT
      node.halfSpaces = []
      node.halfSpaces.push null for i in [0..5]
    chamfer: (stack, node, flags) ->
      node.halfSpaces = []
      node.halfSpaces.push null for i in [0..5]
    bevel: (stack, node, flags) ->
      node.halfSpaces = []
      node.halfSpaces.push null for i in [0..5]
    translate: (stack, node, flags) ->
      # Push the modified ray origin onto the prelude stack
      ro = flags.glslPrelude[flags.glslPrelude.length-1][0] # Current ray origin
      glslCompiler.preludePush flags.glslPrelude, "#{ro} - vec3(#{node.attr.offset[0]}, #{node.attr.offset[1]}, #{node.attr.offset[2]})"
    material: (stack, node, flags) ->
      flags.materialIdStack.push flags.materials.length
      flags.materials.push "vec3(#{node.attr.color[0]}, #{node.attr.color[1]}, #{node.attr.color[2]})"
    default: (stack, node, flags) ->
      return

  # Compile a single corner
  compileCorner = (ro, flags, state, radius) ->
    remainingHalfSpaces = 0
    remainingHalfSpaces += 1 for h in state.hs when h != null
    if remainingHalfSpaces == 1
      # Find the axis (from 0 to 5) for the halfSpace node
      for index in [0..5] when state.hs[index] != null
        state.codes.push primitiveCallback (if index > 2 then "#{ro}[#{index - 3}] - #{state.hs[index]}" else "-#{ro}[#{index}] + #{state.hs[index]}"), flags
        state.hs[index] = null
        break
      remainingHalfSpaces -= 1
    else if remainingHalfSpaces > 1
      cornerSpaces = 0
      cornerSpaces += 1 if state.hs[0] != null or state.hs[3] != null
      cornerSpaces += 1 if state.hs[1] != null or state.hs[4] != null
      cornerSpaces += 1 if state.hs[2] != null or state.hs[5] != null
      if cornerSpaces == 1
        radius = 0
      cornerSize = [
        if state.hs[0] != null then -state.hs[0] - radius else if state.hs[3] != null then state.hs[3] - radius else 0, #999
        if state.hs[1] != null then -state.hs[1] - radius else if state.hs[4] != null then state.hs[4] - radius else 0, #999
        if state.hs[2] != null then -state.hs[2] - radius else if state.hs[5] != null then state.hs[5] - radius else 0] #999
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
      #cornerWithSigns = "vec3(#{if signs[0] then -cornerSize[0] else cornerSize[0]}, #{if signs[1] then -cornerSize[1] else cornerSize[1]}, #{if signs[2] then -cornerSize[2] else cornerSize[2]})"
      cornerWithSigns = "vec3(#{cornerSize[0]}, #{cornerSize[1]}, #{cornerSize[2]})"
      glslCompiler.preludePush flags.glslPrelude, "#{roWithSigns} - #{cornerWithSigns}"
      dist = glslCompiler.preludePop flags.glslPrelude

      # Special cases
      if cornerSpaces > 1
        if radius > 0
          state.codes.push primitiveCallback "length(max(#{dist}, 0.0)) - #{radius}", flags
        else
          state.codes.push primitiveCallback "length(max(#{dist}, 0.0))", flags
        #state.codes.push primitiveCallback "length(max(#{dist}, 0.0))", flags
        if state.hs[0] != null or state.hs[3] != null
          if state.hs[0] != null then state.hs[0] = null else state.hs[3] = null
        if state.hs[1] != null or state.hs[4] != null
          if state.hs[1] != null then state.hs[1] = null else state.hs[4] = null
        if state.hs[2] != null or state.hs[5] != null
          if state.hs[2] != null then state.hs[2] = null else state.hs[5] = null
        remainingHalfSpaces -= cornerSpaces
      else
        # General cases
        if state.hs[0] != null or state.hs[3] != null
          state.codes.push primitiveCallback "#{dist}.x", flags
          if state.hs[0] != null then state.hs[0] = null else state.hs[3] = null
        else if state.hs[1] != null or state.hs[4] != null
          state.codes.push primitiveCallback "#{dist}.y", flags
          if state.hs[1] != null then state.hs[1] = null else state.hs[4] = null
        else if state.hs[2] != null or state.hs[5] != null
          state.codes.push primitiveCallback "#{dist}.z", flags
          if state.hs[2] != null then state.hs[2] = null else state.hs[5] = null
        remainingHalfSpaces -= 1
    return

  compileCompositeNode = (name, cmpCallback, stack, node, flags) ->
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
      compileCorner ro, flags, cornersState, (if node.type == 'chamfer' then node.attr.radius else 0)
      compileCorner ro, flags, cornersState, (if node.type == 'chamfer' then node.attr.radius else 0)
      codes = codes.concat cornersState.codes

      # Post-condition: All halfspaces must be accounted for
      for h in cornersState.hs when h != null
        mecha.logInternalError "GLSL Compiler: Post-condition failed, some half spaces were not processed during corner compilation."
        break

      # Calculate the composite distances
      node.code = codes.shift()
      for c in codes
        node.code = cmpCallback c, node.code, flags
      #if node.type == 'chamfer'
      #  node.code += " - #{node.attr.radius}"
      stack[0].nodes.push node
  
  postDispatch =
    invert: (stack, node, flags) ->
      flags.invert = not flags.invert
    union: (stack, node, flags) ->
      flags.composition.pop()
      compileCompositeNode 'Union', minCallback, stack, node, flags
    intersect: (stack, node, flags) ->
      flags.composition.pop()
      compileCompositeNode 'Intersect', maxCallback, stack, node, flags
    chamfer: (stack, node, flags) ->
      cmpCallback = if flags.composition[flags.composition.length - 1] == glslCompiler.COMPOSITION_UNION then minCallback else maxCallback
      compileCompositeNode 'Chamfer', cmpCallback, stack, node, flags
    bevel: (stack, node, flags) ->
      cmpCallback = if flags.composition[flags.composition.length - 1] == glslCompiler.COMPOSITION_UNION then minCallback else maxCallback
      compileCompositeNode 'Bevel', cmpCallback, stack, node, flags
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
          when 'intersect', 'union', 'chamfer', 'bevel'
            # Assign to the halfspace bins for corner compilation
            index = node.attr.axis + (if flags.invert then 3 else 0)
            val = node.attr.val + translateOffset
            if flags.composition[flags.composition.length - 1] == glslCompiler.COMPOSITION_UNION
              if s.halfSpaces[index] == null or (index < 3 and val < s.halfSpaces[index]) or (index > 2 and val > s.halfSpaces[index])
                s.halfSpaces[index] = val
            else
              if s.halfSpaces[index] == null or (index < 3 and val > s.halfSpaces[index]) or (index > 2 and val < s.halfSpaces[index])
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
            node.code = primitiveCallback "#{node.attr.val} - #{ro}[#{node.attr.axis}]", flags
        break
      stack[0].nodes.push node
    cylinder: (stack, node, flags) ->
      ro = flags.glslPrelude[flags.glslPrelude.length-1][0] # Current ray origin
      planeCoords = ['yz','xz','xy'][node.attr.axis]
      node.code = primitiveCallback "length(#{ro}.#{planeCoords}) - #{node.attr.radius}", flags
      stack[0].nodes.push node
    sphere: (stack, node, flags) ->
      ro = flags.glslPrelude[flags.glslPrelude.length-1][0] # Current ray origin
      node.code = primitiveCallback "length(#{ro}) - #{node.attr.radius}", flags
      stack[0].nodes.push node
    material: (stack, node, flags) ->
      flags.materialIdStack.pop()
      stack[0].nodes.push node
    default: (stack, node, flags) ->
      stack[0].nodes.push node
  
  return ((abstractSolidModel) -> glslCompiler abstractSolidModel, preDispatch, postDispatch)

