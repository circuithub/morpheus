# Compile the GLSL distance function
glslCompilerDistance = (primitiveCallback, minCallback, maxCallback, modifyCallback) ->
  rayOrigin = 'ro'
  preDispatch = 
    invert: (stack, node, flags) ->
      flags.invert = not flags.invert
      return
    union: (stack, node, flags) ->
      flags.composition.push glslCompiler.COMPOSITION_UNION
      node.halfSpaces = []
      node.halfSpaces.push null for i in [0..5]
      return
    intersect: (stack, node, flags) ->
      flags.composition.push glslCompiler.COMPOSITION_INTERSECT
      node.halfSpaces = []
      node.halfSpaces.push null for i in [0..5]
      return
    chamfer: (stack, node, flags) ->
      #node.halfSpaces = []
      #node.halfSpaces.push null for i in [0..5]
      return
    bevel: (stack, node, flags) ->
      #node.halfSpaces = []
      #node.halfSpaces.push null for i in [0..5]
      return
    translate: (stack, node, flags) ->
      # Push the modified ray origin onto the prelude stack
      ro = flags.glslPrelude[flags.glslPrelude.length-1][0] # Current ray origin
      glslCompiler.preludePush flags.glslPrelude, "#{ro} - vec3(#{node.attr.offset})"
      return
    rotate: (stack, node, flags) ->
      # Push the modified ray origin onto the prelude stack
      # Note that we're using the right-hand rules for basis vectors as well as rotations as is the standard convention in physics and math
      ro = flags.glslPrelude[flags.glslPrelude.length-1][0] # Current ray origin
      if Array.isArray node.attr.axis
        # Compute a matrix for the angle-axis rotation
        mat = gl.setMatrix3AxisRotation node.attr.axis, -math_degToRad * node.attr.angle
        glslCompiler.preludePush flags.glslPrelude, "(mat3(#{mat}) * #{ro})"
      else
        # Modify only the components that are needed (yz / xz / xy)
        cosAngle = Math.cos -math_degToRad * node.attr.angle
        sinAngle = Math.sin -math_degToRad * node.attr.angle
        components = [
          switch node.attr.axis
            when 0 then "#{ro}.x"
            when 1 then "#{glsl.add (glsl.mul cosAngle, (ro + '.x')), (glsl.mul sinAngle, (ro + '.z'))}"
            else        "#{glsl.add (glsl.mul cosAngle, (ro + '.x')), (glsl.mul (glsl.neg sinAngle), (ro + '.y'))}"
        ,
          switch node.attr.axis
            when 0 then "#{glsl.add (glsl.mul cosAngle, (ro + '.y')), (glsl.mul (glsl.neg sinAngle), (ro + '.z'))}"
            when 1 then "#{ro}.y"
            else        "#{glsl.add (glsl.mul sinAngle, (ro + '.x')), (glsl.mul cosAngle, (ro + '.y'))}"
        ,
          switch node.attr.axis
            when 0 then "#{glsl.add (glsl.mul sinAngle, (ro + '.y')), (glsl.mul cosAngle, (ro + '.z'))}"
            when 1 then "#{glsl.add (glsl.mul (glsl.neg sinAngle), (ro + '.x')), (glsl.mul cosAngle, (ro + '.z'))}"
            else        "#{ro}.z"
        ]
        glslCompiler.preludePush flags.glslPrelude, "vec3(#{components})"
      return
    scale: (stack, node, flags) ->
      node.halfSpaces = []
      node.halfSpaces.push null for i in [0..5]
      ro = flags.glslPrelude[flags.glslPrelude.length-1][0] # Current ray origin
      if Array.isArray node.attr.value
        mecha.logInternalError "GLSL Compiler: Scale along multiple axes are not yet supported."
      else
        glslCompiler.preludePush flags.glslPrelude, (glsl.div ro, node.attr.value)
      return
    mirror: (stack, node, flags) ->
      # Push the modified ray origin onto the prelude stack
      ro = flags.glslPrelude[flags.glslPrelude.length-1][0] # Current ray origin
      axes = [false, false, false]
      (axes[a] = true) for a in node.attr.axes
      if axes[0] and axes[1] and axes[2]
        glslCompiler.preludePush flags.glslPrelude, "abs(#{ro})"
      else
        axesCodes = ((if axes[i] then "abs(#{ro}[#{i}])" else "#{ro}[#{i}]") for i in [0..2])
        glslCompiler.preludePush flags.glslPrelude, "vec3(#{axesCodes})"
      return
    repeat: (stack, node, flags) ->
      # Push the modified ray origin onto the prelude stack
      ro = flags.glslPrelude[flags.glslPrelude.length-1][0] # Current ray origin
      #parameterizedCount = false
      #(parameterizedCount = true) for c in node.attr.count where typeof c == 'number'
      offsets = ((if typeof node.attr.count[index] == 'string' or node.attr.count[index] > 1 then o else 0.0) for o,index in node.attr.offset)
      limits = ((if typeof node.attr.count[index] == 'string' or node.attr.count[index] > 1 then (glsl.mul (glsl.max 1, node.attr.count[index]), o) else Infinity) for o,index in node.attr.offset)
      repeatOffsets = glslCompiler.preludeAdd flags.glslPrelude, (glsl.vec3Lit offsets), 'vec3'
      repeatHalfOffsets = glslCompiler.preludeAdd flags.glslPrelude, (glsl.mul 0.5, repeatOffsets), 'vec3'
      repeatParity = glslCompiler.preludeAdd flags.glslPrelude, (glsl.mod (glsl.vec3Lit node.attr.count), 2.0)
      repeatInfinite = glslCompiler.preludeAdd flags.glslPrelude, "(mod(#{ro} + #{glsl.mul repeatHalfOffsets, repeatParity}, #{repeatOffsets}) - #{repeatHalfOffsets})"
      repeatRO = "#{repeatInfinite} + step(#{glsl.mul (glsl.vec3Lit limits), 0.5}, abs(#{ro})) * Infinity"
      glslCompiler.preludePush flags.glslPrelude, repeatRO
      return
    material: (stack, node, flags) ->
      flags.materialIdStack.push flags.materials.length
      flags.materials.push "vec3(#{node.attr.color})"
      return
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
        if state.hs[0] != null then state.hs[0] - radius else if state.hs[3] != null then -state.hs[3] + radius else 0, #TODO: zero for cornersize might be the wrong choice... (possibly something large instead?)
        if state.hs[1] != null then state.hs[1] - radius else if state.hs[4] != null then -state.hs[4] + radius else 0,
        if state.hs[2] != null then state.hs[2] - radius else if state.hs[5] != null then -state.hs[5] + radius else 0]
      signs = [
        state.hs[0] == null and state.hs[3] != null,
        state.hs[1] == null and state.hs[4] != null,
        state.hs[2] == null and state.hs[5] != null]
      roComponents  = [
        if signs[0] then "-#{ro}.x" else "#{ro}.x", 
        if signs[1] then "-#{ro}.y" else "#{ro}.y", 
        if signs[2] then "-#{ro}.z" else "#{ro}.z"]
      roWithSigns = 
        if not (signs[0] or signs[1] or signs[2])
          "#{ro}"
        else if (signs[0] or state.hs[3] == null) and (signs[1] or state.hs[4] == null) and (signs[2] or state.hs[5] == null)
          "-#{ro}"
        else
          glslCompiler.preludeAdd flags.glslPrelude, "vec3(#{roComponents[0]}, #{roComponents[1]}, #{roComponents[2]})"
      cornerWithSigns = "vec3(#{cornerSize})"
      dist = glslCompiler.preludeAdd flags.glslPrelude, "#{roWithSigns} - #{cornerWithSigns}"

      # Special cases
      if cornerSpaces > 1
        if radius > 0
          state.codes.push primitiveCallback "length(max(#{dist}, 0.0)) - #{radius}", flags
        else if bevelRadius > 0
          axisCombinations = []
          axisCombinations.push 0 if state.hs[0] != null or state.hs[3] != null
          axisCombinations.push 1 if state.hs[1] != null or state.hs[4] != null
          axisCombinations.push 2 if state.hs[2] != null or state.hs[5] != null
          # TODO: assert(axisCombinations.length >= 2)
          glslCompiler.preludePush flags.glslPrelude, "#{roComponents[axisCombinations[0]]} + #{roComponents[axisCombinations[1]]} - #{cornerSize[axisCombinations[0]] + cornerSize[axisCombinations[1]] - bevelRadius}", "float"
          if axisCombinations.length == 3
            glslCompiler.preludePush flags.glslPrelude, "#{roComponents[axisCombinations[0]]} + #{roComponents[axisCombinations[2]]} - #{cornerSize[axisCombinations[0]] + cornerSize[axisCombinations[2]] - bevelRadius}", "float"
            glslCompiler.preludePush flags.glslPrelude, "#{roComponents[axisCombinations[1]]} + #{roComponents[axisCombinations[2]]} - #{cornerSize[axisCombinations[1]] + cornerSize[axisCombinations[2]] - bevelRadius}", "float"
          switch axisCombinations.length
            when 2
              state.codes.push primitiveCallback "max(length(max(#{dist}, 0.0)), #{math_invsqrt2} * #{glslCompiler.preludePop flags.glslPrelude})", flags
            when 3
              state.codes.push primitiveCallback "max(max(max(length(max(#{dist}, 0.0)), #{math_invsqrt2} * #{glslCompiler.preludePop flags.glslPrelude}), #{math_invsqrt2} * #{glslCompiler.preludePop flags.glslPrelude}), #{math_invsqrt2} * #{glslCompiler.preludePop flags.glslPrelude})", flags
        else # bevelRadius == chamferRadius == 0
          state.codes.push primitiveCallback "length(max(#{dist}, 0.0))", flags
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
            when 'translate','rotate','mirror','repeat','invert','material','chamfer','bevel'
              collectCode codes, node.nodes
      collectCode codes, node.nodes

      # Corner compilation
      ro = flags.glslPrelude[flags.glslPrelude.length-1][0] # Current ray origin
      cornersState = 
        codes: []
        hs: shallowClone node.halfSpaces
      
      # Determine whether the composite should be chamfered / beveled in some way
      chamferRadius = 0
      bevelRadius = 0
      for s in stack
        switch s.type
          when 'chamfer'
            chamferRadius = s.attr.radius
          when 'bevel'
            bevelRadius = s.attr.radius
          when 'translate','rotate','scale','invert','mirror','repeat'
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
    rotate: (stack, node, flags) ->  
      # Remove the modified ray origin from the prelude stack
      glslCompiler.preludePop flags.glslPrelude
      # Check that composite node is not empty
      if node.nodes.length == 0
        mecha.logInternalError "GLSL Compiler: Rotate node is empty."
        return
      stack[0].nodes.push node
    scale: (stack, node, flags) ->
      if flags.composition[flags.composition.length-1] == glslCompiler.COMPOSITION_UNION
        compileCompositeNode 'Scale', minCallback, stack, node, flags
      else if flags.composition[flags.composition.length-1] == glslCompiler.COMPOSITION_INTERSECT
        compileCompositeNode 'Scale', maxCallback, stack, node, flags
      if not Array.isArray node.attr.value
        node.code = modifyCallback node.code, (glsl.mul "(#{node.code})", node.attr.value)
      glslCompiler.preludePop flags.glslPrelude
      stack[0].nodes.push node
    mirror: (stack, node, flags) ->
      # Remove the modified ray origin from the prelude stack
      glslCompiler.preludePop flags.glslPrelude
      stack[0].nodes.push node
    repeat: (stack, node, flags) ->
      # Remove the modified ray origin from the prelude stack
      glslCompiler.preludePop flags.glslPrelude
      stack[0].nodes.push node
    halfspace: (stack, node, flags) ->
      # Check that geometry node is empty
      if node.nodes.length != 0
        mecha.logInternalError "GLSL Compiler: Halfspace node is not empty."
        return
      
      ###
      ro = flags.glslPrelude[flags.glslPrelude.length-1][0] # Current ray origin
      if flags.invert
        node.code = primitiveCallback (glsl.sub node.attr.val, "#{ro}[#{node.attr.axis}]"), flags
      else
        node.code = primitiveCallback (glsl.sub "#{ro}[#{node.attr.axis}]", node.attr.val), flags
      # ###

      ## Generate half-space primitive when it cannot be compiled into a corner
      if typeof node.attr.val == 'string'
        ro = flags.glslPrelude[flags.glslPrelude.length-1][0] # Current ray origin
        if flags.invert
          node.code = primitiveCallback (glsl.sub node.attr.val, "#{ro}[#{node.attr.axis}]"), flags
        else
          node.code = primitiveCallback (glsl.sub "#{ro}[#{node.attr.axis}]", node.attr.val), flags
      else
        # Bin half-spaces for corner compilation
        translateOffset = 0.0
        for s in stack
          if s.halfSpaces?
            # Assign to the halfspace bins for corner compilation
            index = node.attr.axis + (if flags.invert then 3 else 0)
            val = glsl.add node.attr.val, translateOffset
            if flags.composition[flags.composition.length - 1] == glslCompiler.COMPOSITION_UNION
              if s.halfSpaces[index] == null or (index < 3 and val > s.halfSpaces[index]) or (index > 2 and val < s.halfSpaces[index])
                s.halfSpaces[index] = val
            else
              if s.halfSpaces[index] == null or (index < 3 and val < s.halfSpaces[index]) or (index > 2 and val > s.halfSpaces[index])
                s.halfSpaces[index] = val
          else
            switch s.type
              when 'translate'
                translateOffset = glsl.add translateOffset, s.attr.offset[node.attr.axis]
                continue # Search for preceding intersect/union node 
              when 'invert', 'mirror'
                continue # Search for preceding intersect/union node
              else
                # This may occur in special cases where we cannot do normal corner compilation
                # (Such as a separate transformation on the plane itself - with a wedge node for example)
                ro = flags.glslPrelude[flags.glslPrelude.length-1][0] # Current ray origin
                if flags.invert
                  node.code = primitiveCallback (glsl.sub node.attr.val, "#{ro}[#{node.attr.axis}]"), flags
                else
                  node.code = primitiveCallback (glsl.sub "#{ro}[#{node.attr.axis}]", node.attr.val), flags
          break
      # ###
      stack[0].nodes.push node
    cylinder: (stack, node, flags) ->
      ro = flags.glslPrelude[flags.glslPrelude.length-1][0] # Current ray origin
      planeCoords = ['yz','xz','xy'][node.attr.axis]
      if not flags.invert
        node.code = primitiveCallback (glsl.sub "length(#{ro}.#{planeCoords})", node.attr.radius), flags
      else
        node.code = primitiveCallback (glsl.sub node.attr.radius, "length(#{ro}.#{planeCoords})"), flags
      stack[0].nodes.push node
    sphere: (stack, node, flags) ->
      ro = flags.glslPrelude[flags.glslPrelude.length-1][0] # Current ray origin
      if not flags.invert
        node.code = primitiveCallback (glsl.sub "length(#{ro})", node.attr.radius), flags
      else
        node.code = primitiveCallback (glsl.sub node.attr.radius, "length(#{ro})"), flags
      stack[0].nodes.push node
    material: (stack, node, flags) ->
      flags.materialIdStack.pop()
      stack[0].nodes.push node
    default: (stack, node, flags) ->
      stack[0].nodes.push node
  
  return ((abstractSolidModel) -> glslCompiler abstractSolidModel, preDispatch, postDispatch)

