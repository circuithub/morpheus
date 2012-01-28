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
      ro = glslCompiler.preludeTop flags.glslPrelude # Current ray origin
      glslCompiler.preludePush flags.glslPrelude, "#{ro} - vec3(#{node.attr.offset})"
      return
    rotate: (stack, node, flags) ->
      # Push the modified ray origin onto the prelude stack
      # Note that we're using the right-hand rules for basis vectors as well as rotations as is the standard convention in physics and math
      ro = glslCompiler.preludeTop flags.glslPrelude # Current ray origin
      if Array.isArray node.attr.axis
        # Compute a matrix for the angle-axis rotation
        mat = gl.matrix3.newAxisRotation node.attr.axis, -math_degToRad * node.attr.angle
        glslCompiler.preludePush flags.glslPrelude, "mat3(#{mat}) * #{ro}"
      else
        # Modify only the components that are needed (yz / xz / xy)
        cosAngle = glsl.cos (glsl.mul -math_degToRad, node.attr.angle)
        sinAngle = glsl.sin (glsl.mul -math_degToRad, node.attr.angle)
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
      ro = glslCompiler.preludeTop flags.glslPrelude # Current ray origin
      if Array.isArray node.attr.factor
        mecha.logInternalError "GLSL Compiler: Scale along multiple axes are not yet supported."
      else
        glslCompiler.preludePush flags.glslPrelude, (glsl.div ro, node.attr.factor)
      return
    mirror: (stack, node, flags) ->
      # Push the modified ray origin onto the prelude stack
      ro = glslCompiler.preludeTop flags.glslPrelude # Current ray origin
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
      ro = glslCompiler.preludeTop flags.glslPrelude # Current ray origin
      #parameterizedCount = false
      #(parameterizedCount = true) for c in node.attr.count where typeof c == 'number'
      if not node.attr.count?
        interval = glslCompiler.preludeAdd flags.glslPrelude, (glsl.vec3Lit node.attr.interval), 'vec3'
        halfInterval = glslCompiler.preludeAdd flags.glslPrelude, (glsl.mul 0.5, interval), 'vec3'
        glslCompiler.preludePush flags.glslPrelude, "mod(abs(#{ro} + #{halfInterval}), #{interval})}"
        #repeatRO = glsl.mul (glsl.sub (glsl.fract (glsl.div ro, interval)), glsl.vec3Lit [0.5, 0.5, 0.5]), interval
      else
        preludeVar = (a,type) -> glslCompiler.preludeAdd flags.glslPrelude, a, type
        interval = preludeVar (glsl.vec3Lit node.attr.interval), 'vec3'
        halfInterval = preludeVar (glsl.mul 0.5, interval), 'vec3'
        parity = preludeVar (glsl.mod node.attr.count, "vec3(2.0)") # todo: [2.0,2.0,2.0] (optimization)
        halfParity = preludeVar (glsl.mul 0.5, parity)
        roSubParity = glsl.sub ro, (glsl.mul halfParity, interval)
        cell = preludeVar (glsl.div roSubParity, interval)
        cellFloor = preludeVar (glsl.floor cell)
        halfCells = glsl.mul node.attr.count, 0.5
        cellMin = preludeVar (glsl.sub (glsl.neg halfCells), halfParity)
        cellMax = preludeVar (glsl.sub (glsl.sub halfCells, halfParity), "vec3(1.0)") # todo: [1.0,1.0,1.0] (optimization)
        cellClamp = glsl.clamp cellFloor, cellMin, cellMax
        cellClampInterval = glsl.mul cellClamp, interval
        glslCompiler.preludePush flags.glslPrelude, (glsl.sub (glsl.sub roSubParity, cellClampInterval), halfInterval)
      return
    material: (stack, node, flags) ->
      flags.materialIdStack.push flags.materials.length
      flags.materials.push "vec3(#{node.attr.color})"
      return
    default: (stack, node, flags) ->
      return

  # Compile a single corner
  ###

  # TODO: This is overly complex and broken... need a better optimization method for corners....
  # (Perhaps one that lets the GLSL compiler precompute operations between uniforms (e.g. glsl.min(param0, param1)

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
      chamferRadius = 0 if cornerSpaces == 1 or bevelRadius != 0
      cornerSize = [
        if state.hs[0] != null then (glsl.sub state.hs[0], radius) else if state.hs[3] != null then (glsl.sub radius, state.hs[3]) else 0, #TODO: zero for cornersize might be the wrong choice... (possibly something large instead?)
        if state.hs[1] != null then (glsl.sub state.hs[1], radius) else if state.hs[4] != null then (glsl.sub radius, state.hs[4]) else 0,
        if state.hs[2] != null then (glsl.sub state.hs[2], radius) else if state.hs[5] != null then (glsl.sub radius, state.hs[5]) else 0]
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
      cornerWithSigns = glsl.vec3Lit cornerSize
      dist = glslCompiler.preludeAdd flags.glslPrelude, "#{roWithSigns} - #{glsl.vec3Lit cornerSize}"

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
  ###

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
      return
    collectCode codes, node.nodes

    # Corner compilation
    ro = glslCompiler.preludeTop flags.glslPrelude # Current ray origin
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

    ### Compile the first and a possible second corner
    compileCorner ro, flags, cornersState, chamferRadius, bevelRadius
    compileCorner ro, flags, cornersState, chamferRadius, bevelRadius
    codes = codes.concat cornersState.codes
    # ###

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
    return
    
  postDispatch =
    invert: (stack, node, flags) ->
      flags.invert = not flags.invert
      stack[0].nodes.push node
    union: (stack, node, flags) ->
      flags.composition.pop()
      compileCompositeNode 'Union', (if not flags.invert then minCallback else maxCallback), stack, node, flags
      stack[0].nodes.push node
    intersect: (stack, node, flags) ->
      flags.composition.pop()
      compileCompositeNode 'Intersect', (if not flags.invert then maxCallback else minCallback), stack, node, flags
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
      if not Array.isArray node.attr.factor
        node.code = modifyCallback node.code, (glsl.mul "(#{node.code})", node.attr.factor)
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
      
      ## Generate code for halfspace primitives directly (without corner compilation)
      ro = glslCompiler.preludeTop flags.glslPrelude # Current ray origin
      if flags.invert
        node.code = primitiveCallback (glsl.sub node.attr.val, "#{ro}[#{node.attr.axis}]"), flags
      else
        node.code = primitiveCallback (glsl.sub "#{ro}[#{node.attr.axis}]", node.attr.val), flags
      # ###

      ### Generate half-space primitive when it cannot be compiled into a corner
      #if typeof node.attr.val == 'string'
      #  ro = glslCompiler.preludeTop flags.glslPrelude # Current ray origin
      #  if flags.invert
      #    node.code = primitiveCallback (glsl.sub node.attr.val, "#{ro}[#{node.attr.axis}]"), flags
      #  else
      #    node.code = primitiveCallback (glsl.sub "#{ro}[#{node.attr.axis}]", node.attr.val), flags
      #else
      # Bin half-spaces for corner compilation
      translateOffset = 0.0
      for s in stack
        if s.halfSpaces?
          # Assign to the halfspace bins for corner compilation
          index = node.attr.axis + (if flags.invert then 3 else 0)
          val = glsl.add node.attr.val, translateOffset
          s.halfSpaces[index] =
            if s.halfSpaces[index] == null
               val
            else if flags.composition[flags.composition.length - 1] == glslCompiler.COMPOSITION_UNION
              if index < 3
                glsl.max s.halfSpaces[index], val
              else
                glsl.min s.halfSpaces[index], val
            else
              if index < 3
                glsl.min s.halfSpaces[index], val
              else
                glsl.max s.halfSpaces[index], val
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
              ro = glslCompiler.preludeTop flags.glslPrelude # Current ray origin
              if flags.invert
                node.code = primitiveCallback (glsl.sub node.attr.val, "#{ro}[#{node.attr.axis}]"), flags
              else
                node.code = primitiveCallback (glsl.sub "#{ro}[#{node.attr.axis}]", node.attr.val), flags
        break
      # ###
      stack[0].nodes.push node
    corner: (stack,node,flags) ->
      ro = glslCompiler.preludeTop flags.glslPrelude # Current ray origin
      dist = glslCompiler.preludeAdd flags.glslPrelude, glsl.sub ro, node.attr.val
      # TODO: Optimization - handle rotations
      # TODO: pass bevel/chamfer along as state - and refactor (probably use the last state rather than 
      #       picking the max radius)
      
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
      #console.log "NODE ATTR", node.attr
      # TODO: Need to squareroot chamfer radius??? (so that 
      if bevelRadius != 0
        # TODO: BUSY HERE
        # TODO: Previous bevel implementation is wrong
        roSigned = glslCompiler.preludeAdd flags.glslPrelude, if flags.invert then "-#{ro}" else "#{ro}"
        cornerVal = if typeof node.attr.val == 'string' then (glslCompiler.preludeAdd flags.glslPrelude, node.attr.val) else node.attr.val
        # Diagonal distance is calculated by transforming ro into the rotational space
        diagonalDist = [
          "(#{roSigned}[0] + #{roSigned}[1] - (#{glsl.add (glsl.index cornerVal, 0), (glsl.index cornerVal, 1)}))",
          "(#{roSigned}[0] + #{roSigned}[2] - (#{glsl.add (glsl.index cornerVal, 0), (glsl.index cornerVal, 2)}))",
          "(#{roSigned}[1] + #{roSigned}[2] - (#{glsl.add (glsl.index cornerVal, 1), (glsl.index cornerVal, 2)}))"
        ]
        if flags.invert
          cornerDist = "length(min(#{dist}, 0.0))"
          node.code = primitiveCallback "min(min(min(#{cornerDist}, #{math_invsqrt2} * #{glsl.index diagonalDist, 0} - #{bevelRadius}), #{math_invsqrt2} * #{glsl.index diagonalDist, 1} - #{bevelRadius}), #{math_invsqrt2} * #{glsl.index diagonalDist, 2} - #{bevelRadius})", flags
        else
          cornerDist = "length(max(#{dist}, 0.0))"
          node.code = primitiveCallback "max(max(max(#{cornerDist}, #{math_invsqrt2} * #{glsl.index diagonalDist, 0} + #{bevelRadius}), #{math_invsqrt2} * #{glsl.index diagonalDist, 1} + #{bevelRadius}), #{math_invsqrt2} * #{glsl.index diagonalDist, 2} + #{bevelRadius})", flags
      else if chamferRadius != 0
        if flags.invert
          node.code = primitiveCallback "length(min(#{glsl.add dist, chamferRadius}, 0.0)) - #{chamferRadius}", flags
        else
          node.code = primitiveCallback "length(max(#{glsl.add dist, chamferRadius}, 0.0)) - #{chamferRadius}", flags
      else # bevelRadius == chamferRadius == 0
        if flags.invert
          node.code = primitiveCallback "length(min(#{dist}, 0.0))", flags
        else
          node.code = primitiveCallback "length(max(#{dist}, 0.0))", flags
      stack[0].nodes.push node
    cylinder: (stack, node, flags) ->
      ro = glslCompiler.preludeTop flags.glslPrelude # Current ray origin
      planeCoords = ['yz','xz','xy'][node.attr.axis]
      if not flags.invert
        node.code = primitiveCallback (glsl.sub "length(#{ro}.#{planeCoords})", node.attr.radius), flags
      else
        node.code = primitiveCallback (glsl.sub node.attr.radius, "length(#{ro}.#{planeCoords})"), flags
      stack[0].nodes.push node
    sphere: (stack, node, flags) ->
      ro = glslCompiler.preludeTop flags.glslPrelude # Current ray origin
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

