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
      #node.halfSpaces = []
      #node.halfSpaces.push null for i in [0..5]
    bevel: (stack, node, flags) ->
      #node.halfSpaces = []
      #node.halfSpaces.push null for i in [0..5]
    translate: (stack, node, flags) ->
      # Push the modified ray origin onto the prelude stack
      ro = flags.glslPrelude[flags.glslPrelude.length-1][0] # Current ray origin
      glslCompiler.preludePush flags.glslPrelude, "#{ro} - vec3(#{node.attr.offset[0]}, #{node.attr.offset[1]}, #{node.attr.offset[2]})"
    mirror: (stack, node, flags) ->
      # Push the modified ray origin onto the prelude stack
      ro = flags.glslPrelude[flags.glslPrelude.length-1][0] # Current ray origin
      glslCompiler.preludePush flags.glslPrelude, "abs(#{ro})"
    material: (stack, node, flags) ->
      flags.materialIdStack.push flags.materials.length
      flags.materials.push "vec3(#{node.attr.color[0]}, #{node.attr.color[1]}, #{node.attr.color[2]})"
    default: (stack, node, flags) ->
      return

  # Compile a single corner
  compileCorner = (ro, flags, state, chamferRadius, bevelRadius) ->
    remainingHalfSpaces = 0
    remainingHalfSpaces += 1 for h in state.hs when h != null
    #if remainingHalfSpaces == 1
    #  # Find the axis (from 0 to 5) for the halfSpace node
    #  for index in [0..5] when state.hs[index] != null
    #    state.codes.push primitiveCallback (if index > 2 then "#{ro}[#{index - 3}] - #{state.hs[index]}" else "-#{ro}[#{index}] + #{state.hs[index]}"), flags
    #    state.hs[index] = null
    #    break
    #  remainingHalfSpaces -= 1
    #else if remainingHalfSpaces > 1
    if remainingHalfSpaces > 0
      cornerSpaces = 0
      cornerSpaces += 1 if state.hs[0] != null or state.hs[3] != null
      cornerSpaces += 1 if state.hs[1] != null or state.hs[4] != null
      cornerSpaces += 1 if state.hs[2] != null or state.hs[5] != null
      radius = if cornerSpaces == 1 or bevelRadius > chamferRadius then 0 else chamferRadius
      cornerSize = [
        if state.hs[0] != null then -state.hs[0] - radius else if state.hs[3] != null then state.hs[3] - radius else 0, #TODO: zero for cornersize might be the wrong choice... (possibly something large instead?)
        if state.hs[1] != null then -state.hs[1] - radius else if state.hs[4] != null then state.hs[4] - radius else 0,
        if state.hs[2] != null then -state.hs[2] - radius else if state.hs[5] != null then state.hs[5] - radius else 0]
      signs = [
        state.hs[0] == null and state.hs[3] != null,
        state.hs[1] == null and state.hs[4] != null,
        state.hs[2] == null and state.hs[5] != null]
      roWithSigns = 
        if not (signs[0] or signs[1] or signs[2])
          "#{ro}"
        else if (signs[0] or state.hs[3] == null) and (signs[1] or state.hs[4] == null) and (signs[2] or state.hs[5] == null)
          "-#{ro}"
        else
          glslCompiler.preludeAdd flags.glslPrelude, "vec3(#{if signs[0] then '-' else ''}#{ro}.x, #{if signs[1] then '-' else ''}#{ro}.y, #{if signs[2] then '-' else ''}#{ro}.z"
      cornerWithSigns = "vec3(#{cornerSize[0]}, #{cornerSize[1]}, #{cornerSize[2]})"
      dist = glslCompiler.preludeAdd flags.glslPrelude, "#{roWithSigns} + #{cornerWithSigns}"

      # Special cases
      if cornerSpaces > 1
        if radius > 0
          state.codes.push primitiveCallback "length(max(#{dist}, 0.0)) - #{radius}", flags
        else if bevelRadius > 0
          axisDist = glslCompiler.preludeAdd flags.glslPrelude, "#{ro}[0] + #{ro}[1] - #{cornerSize[0] + cornerSize[1] - bevelRadius}", "float"
          state.codes.push primitiveCallback "max(length(max(#{dist}, 0.0)), #{math_invsqrt2} * length(vec2(#{axisDist})))", flags
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
            when 'translate','mirror','invert','material','chamfer','bevel'
              collectCode codes, node.nodes
      collectCode codes, node.nodes

      # Corner compilation
      ro = flags.glslPrelude[flags.glslPrelude.length-1][0] # Current ray origin
      cornersState = 
        codes: []
        hs: node.halfSpaces.shallowClone()
      
      # Determine whether the composite should be chamfered / beveled in some way
      chamferRadius = 0
      bevelRadius = 0
      for s in stack
        switch s.type
          when 'chamfer'
            chamferRadius = s.attr.radius
          when 'bevel'
            bevelRadius = s.attr.radius
          when 'translate','invert','mirror'
            continue
        break

      # Compile the first and a possible second corner
      compileCorner ro, flags, cornersState, chamferRadius, bevelRadius
      compileCorner ro, flags, cornersState, chamferRadius, bevelRadius
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
    
  postDispatch =
    invert: (stack, node, flags) ->
      flags.invert = not flags.invert
      stack[0].nodes.push node
    union: (stack, node, flags) ->
      flags.composition.pop()
      compileCompositeNode 'Union', minCallback, stack, node, flags
      stack[0].nodes.push node
    intersect: (stack, node, flags) ->
      flags.composition.pop()
      compileCompositeNode 'Intersect', maxCallback, stack, node, flags
      stack[0].nodes.push node
    chamfer: (stack, node, flags) ->
      # NOTE: From now on chamfer must be on the outside of an intersect/union
      #  cmpCallback = if flags.composition[flags.composition.length - 1] == glslCompiler.COMPOSITION_UNION then minCallback else maxCallback
      #  compileCompositeNode 'Chamfer', cmpCallback, stack, node, flags
      stack[0].nodes.push node
    bevel: (stack, node, flags) ->
      #  cmpCallback = if flags.composition[flags.composition.length - 1] == glslCompiler.COMPOSITION_UNION then minCallback else maxCallback
      #  compileCompositeNode 'Bevel', cmpCallback, stack, node, flags
      stack[0].nodes.push node
    translate: (stack, node, flags) ->  
      # Remove the modified ray origin from the prelude stack
      glslCompiler.preludePop flags.glslPrelude
      # Check that composite node is not empty
      if node.nodes.length == 0
        mecha.logInternalError "GLSL Compiler: Translate node is empty."
        return
      stack[0].nodes.push node
    mirror: (stack, node, flags) ->
      # Remove the modified ray origin from the prelude stack
      glslCompiler.preludePop flags.glslPrelude
      stack[0].nodes.push node
    halfspace: (stack, node, flags) ->
      # Check that geometry node is empty
      if node.nodes.length != 0
        mecha.logInternalError "GLSL Compiler: Halfspace node is not empty."
        return
      translateOffset = 0.0
      for s in stack
        switch s.type
          when 'intersect', 'union' #, 'chamfer', 'bevel' # Note: halfspaces shouldn't be nested inside chamfer/bevel... (anymore)
            # Assign to the halfspace bins for corner compilation
            index = node.attr.axis + (if flags.invert then 3 else 0)
            val = node.attr.val + translateOffset
            if flags.composition[flags.composition.length - 1] == glslCompiler.COMPOSITION_UNION
              if s.halfSpaces[index] == null or (index < 3 and val > s.halfSpaces[index]) or (index > 2 and val < s.halfSpaces[index])
                s.halfSpaces[index] = val
            else
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

