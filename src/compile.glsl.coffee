# Compile the abstract solid model to GLSL for shaders

# TODO: Would be nice if CoffeeScript supported '''#{tag}''' syntax

compileGLSL = (abstractSolidModel) ->
  prefix = 
    '''
    #ifdef GL_ES
      precision highp float;
    #endif
    uniform vec3 SCENEJS_uEye;                  // World-space eye position
    varying vec3 SCENEJS_vEyeVec;               // Output world-space eye vector
    varying vec4 SCENEJS_vWorldVertex;          // Varying for fragment clip or world pos hook
    
    '''

  uniforms = "" # TODO

  rayOrigin = 'ro'
  rayDirection = 'rd'
  
  sceneDist = (prelude, code) ->
    #preludeCode = ""
    #for keyValue in glslParams.prelude
    #  preludeCode += "  vec3 #{keyValue[0]} = #{keyValue[1]};\n"
    "\nfloat sceneDist(in vec3 #{rayOrigin}){\n#{prelude}  return #{code};\n}\n\n"
  
  sceneRayDist = 
    # ro = ray origin
    # rd = ray direction
    '''
    float sceneRayDist(in vec3 ro, in vec3 rd) {
      return 0.0;
    }
    
    '''

  sceneNormal =
    # p = position (ray hit position)
    '''
    vec3 sceneNormal(in vec3 p) {
      const float eps = 0.0001;
      vec3 n;
      n.x = sceneDist( vec3(p.x+eps, p.yz) ) - sceneDist( vec3(p.x-eps, p.yz) );
      n.y = sceneDist( vec3(p.x, p.y+eps, p.z) ) - sceneDist( vec3(p.x, p.y-eps, p.z) );
      n.z = sceneDist( vec3(p.xy, p.z+eps) ) - sceneDist( vec3(p.xy, p.z-eps) );
      return normalize(n);
    }
    
    '''

  main = 
    '''
    void main(void) {
      const int steps = 64;
      const float threshold = 0.01;
      vec3 rayDir = /*normalize*/(/*SCENEJS_uMMatrix * */ -SCENEJS_vEyeVec);
      vec3 rayOrigin = SCENEJS_vWorldVertex.xyz;
      bool hit = false;
      float dist = 0.0;
      for(int i = 0; i < steps; i++) {
        //dist = sceneRayDist(rayOrigin, rayDir);
        dist = sceneDist(rayOrigin);
        if (dist < threshold) {
          hit = true;
          break;
        }
        rayOrigin += dist * rayDir;
      }
      if(!hit) { discard; }
      /*if(!hit) { gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0); return; }*/
      const vec3 diffuseColor = vec3(0.1, 0.2, 0.8);
      /*const vec3 specularColor = vec3(1.0, 1.0, 1.0);*/
      const vec3 lightPos = vec3(1.5,1.5, 4.0);
      vec3 ldir = normalize(lightPos - rayOrigin);
      vec3 diffuse = diffuseColor * dot(sceneNormal(rayOrigin), ldir);
      gl_FragColor = vec4(diffuse, 1.0);
    }
    
    '''
  
  # Compile the ASM
  #match = (node, pattern) ->
  #  subpattern = pattern[node.type]
  #  #if subpattern?
  #  #  return match node, subpattern
  
  ###
  # Compile an ASM intersect node to GLSL
  compileIntersect = (node, flags, glslParams) ->
    currentRayOrigin = glslParams.prelude[glslParams.prelude.length - 1][0]

    if node.nodes.length == 0
      mecha.logInternalError 'GLSL Compiler: Intersect nodes should not be empty.'
      return

    for childNode in node.nodes
      switch childNode.type
        when 'intersect'
          mecha.logInternalError "GLSL Compiler: Intersect nodes should not be directly nested, expected intersect nodes to be flattened by the ASM compiler."
        when 'mirror'
          glslParams.prelude.push ['r' + glslParams.prelude.length,
              switch childNode.attr.axes.length
                when 3 then "abs(#{currentRayOrigin})"
                when 1
                  switch childNode.attr.axes[0]
                    when 0 then "vec3(abs(#{currentRayOrigin}.x), #{currentRayOrigin}.yz)"
                    when 1 then "vec3(#{currentRayOrigin}.x, abs(#{currentRayOrigin}.y), #{currentRayOrigin}.z)"
                    when 2 then "vec3(#{currentRayOrigin}.xy, abs(#{currentRayOrigin}.z))"
                    else 
                      mecha.logInternalError "GLSL Compiler: Unknown axis #{childNode.attr.axes[0]} in mirror node."
                      currentRayOrigin
                when 2
                  if childNode.attr.axes[0] != 0 and childNode.attr.axes[1] != 0
                    "vec3(#{currentRayOrigin}.x, abs(#{currentRayOrigin}.yz)"
                  else if childNode.attr.axes[0] != 1 and childNode.attr.axes[1] != 1
                    "vec3(abs(#{currentRayOrigin}.x), (#{currentRayOrigin}.y, abs(#{currentRayOrigin}.z))"
                  else
                    "vec3(abs(#{currentRayOrigin}.xy), #{currentRayOrigin}.z)"
                else 
                  mecha.logInternalError "GLSL Compiler: Mirror node has #{childNode.attr.axes.length} axes, expected between 1 and 3."
                  currentRayOrigin
            ]
          glslParams.prelude.code += "  vec3 #{glslParams.prelude[glslParams.prelude.length - 1][0]} = #{glslParams.prelude[glslParams.prelude.length - 1][1]};\n"
          compileIntersect childNode, flags, glslParams
          glslParams.prelude.pop()
        when 'translate'
          glslParams.prelude.push ['r' + glslParams.prelude.length, "vec3(#{childNode.attr.offset[0]}, #{childNode.attr.offset[1]}, #{childNode.attr.offset[2]})"]
          glslParams.prelude.code += "  vec3 #{glslParams.prelude[glslParams.prelude.length - 1][0]} = #{glslParams.prelude[glslParams.prelude.length - 1][1]};\n"
          compileIntersect childNode, flags, glslParams
          glslParams.prelude.pop()
        when 'invert'
          flags.invert = not flags.invert
          compileIntersect childNode, flags, glslParams
          flags.invert = not flags.invert
        when 'halfspace' # ignore
        else
          mecha.logInternalError "GLSL Compiler: Could not compile unknown node with type #{childNode.type}."
    
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
    collectASM.intersect node.nodes, flags, halfSpaceBins
    if halfSpaceBins[0].length > 0 and halfSpaceBins[1].length > 0 and halfSpaceBins[2].length > 0
      glslParams.functions.corner = true
      glslParams.code = "#{glslLibrary.distanceFunctions.cornerDist.id}(#{currentRayOrigin}, vec3(#{-halfSpaceBins[0]}, #{-halfSpaceBins[1]}, #{-halfSpaceBins[2]}))"
    
    #TODO: if halfSpaceBins[3].length > 0 and halfSpaceBins[4].length > 0 and halfSpaceBins[5].length > 0

  # Compile an ASM node to GLSL
  compileNode = (node, flags, glslParams) ->
    switch node.type
      when 'intersect'
        # Check that composite node is not empty
        if node.nodes.length == 0
          mecha.logInternalError "GLSL Compiler: Intersect node is empty."
          return
        compileIntersect node, flags, glslParams
      when 'translate'
        glslParams.prelude.push ['r' + glslParams.prelude.length, "vec3(#{node.attr.offset[0]}, #{node.attr.offset[1]}, #{node.attr.offset[2]})"]
        glslParams.prelude.code += "  vec3 #{glslParams.prelude[glslParams.prelude.length - 1][0]} = #{glslParams.prelude[glslParams.prelude.length - 1][1]};\n"
        for childNode in node.nodes
          compileNode childNode, flags, glslParams
        glslParams.prelude.pop()
      when 'invert'
        flags.invert = not flags.invert
        compileNode n, flags, glslParams for n in node.nodes
        flags.invert = not flags.invert
      else
        mecha.logInternalError "GLSL Compiler: Could not compile unknown node with type #{node.type}."
        glslINFINITY = '1.0/0.0'
        glslParams.code = "#{glslINFINITY}"
  ###
  preludePush = (prelude, value) ->
    name = 'r' + prelude.counter
    prelude.push [name, value]
    prelude.counter += 1
    prelude.code += "  vec3 #{name} = #{value};\n"
    return name

  preludePop = (prelude) ->
    return prelude.pop()[0]
    
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
      currentRayOrigin = flags.glslPrelude[flags.glslPrelude.length-1][0]
      preludePush flags.glslPrelude, "#{currentRayOrigin} - vec3(#{node.attr.offset[0]}, #{node.attr.offset[1]}, #{node.attr.offset[2]})"
    default: (stack, node, flags) ->
      return
  
  postDispatch =
    invert: (stack, node, flags) ->
      flags.invert = not flags.invert
    union: (stack, node, flags) ->
      # Check that composite node is not empty
      if node.nodes.length == 0
        mecha.logInternalError "GLSL Compiler: Union node is empty."
        return
      node.code = ""

      # Some nodes are only modifiers, so it's necessary to collect their children 
      # to apply the correct composite operation
      collectChildren = (node, children) -> 
        for child in children
          if child.code?
            if node.code.length > 0
              node.code = "min(#{childNode.code}, #{node.code})"
            else
              node.code = child.code
          else switch child.type
            when 'translate','mirror','invert'
              collectChildren node, child.nodes
      collectChildren node, node.nodes

      # Corner compilation
      currentRayOrigin = flags.glslPrelude[flags.glslPrelude.length-1][0]
      if (node.halfSpaces[0] != null or node.halfSpaces[3] != null) and
          (node.halfSpaces[1] != null or node.halfSpaces[4] != null) and
          (node.halfSpaces[2] != null or node.halfSpaces[5] != null)
        cornerSize = [
          if node.halfSpaces[0] != null then node.halfSpaces[0] else node.halfSpaces[3],
          if node.halfSpaces[1] != null then node.halfSpaces[1] else node.halfSpaces[4],
          if node.halfSpaces[2] != null then node.halfSpaces[2] else node.halfSpaces[5]]
        preludePush flags.glslPrelude, "#{currentRayOrigin} - vec3(#{cornerSize[0]}, #{cornerSize[1]}, #{cornerSize[2]})"
        dist = preludePop flags.glslPrelude
        if node.code.length > 0
          node.code = "min(min(min(#{dist}.x, #{dist}.y), #{dist}.z), #{node.code});"
        else
          node.code = "min(min(#{dist}.x, #{dist}.y), #{dist}.z);"
      stack[0].nodes.push node
    intersect: (stack, node, flags) ->
      # Check that composite node is not empty
      if node.nodes.length == 0
        mecha.logInternalError "GLSL Compiler: Intersect node is empty."
        return
      codes = []
      codes.push childNode.code for childNode in node.nodes when childNode.code?

      # Some nodes are only modifiers, so it's necessary to collect their children 
      # to apply the correct composite operation
      collectCode = (codes, nodes) -> 
        for node in nodes
          codes.push node.code if node.code?
          switch node.type
            when 'translate','mirror','invert'
              collectCode codes, node.nodes
      collectCode codes, node.nodes

      # Corner compilation
      currentRayOrigin = flags.glslPrelude[flags.glslPrelude.length-1][0]
      hs = node.halfSpaces
      remainingHalfSpaces = 0
      remainingHalfSpaces += 1 for h in hs when h != null

      # Compile the first corners
      if remainingHalfSpaces == 1
        # Find the axis (from 0 to 5) for the halfSpace node
        for index in [0..5] when hs[index] != null
          codes.push (if index > 2 then "#{currentRayOrigin}[#{index}] - #{hs[index]}" else "-#{currentRayOrigin}[#{index - 3}] + #{hs[index]}")
          break
        remainingHalfSpaces -= 1
      else if remainingHalfSpaces == 2 and ((hs[0] and hs[3]) or (hs[1] and hs[4]) or (hs[2] and hs[5]))
        # Find the axis (from 0 to 5) for the halfSpace node
        for index in [0..2] when hs[index] != null
          codes.push "#{currentRayOrigin}[#{index}] - #{hs[index]}"
          codes.push "-#{currentRayOrigin}[#{index}] + #{hs[index+3]}"
          break
        remainingHalfSpaces -= 2
      else if remainingHalfSpaces > 1
        # Compile prelude calculations
        cornerSize = [
          if hs[0] != null then hs[0] else if hs[3] then hs[3] else 0.0,
          if hs[1] != null then hs[1] else if hs[4] then hs[4] else 0.0,
          if hs[2] != null then hs[2] else if hs[5] then hs[5] else 0.0]
        if hs[0] and hs[1] and hs[2]
          preludePush flags.glslPrelude, "#{currentRayOrigin} - vec3(#{cornerSize[0]}, #{cornerSize[1]}, #{cornerSize[2]})"
          dist = preludePop flags.glslPrelude
          codes = codes.concat ["#{dist}.x", "#{dist}.y", "#{dist}.z"]
          remainingHalfSpaces -= 3
        if hs[3] and hs[4] and hs[5]
          preludePush flags.glslPrelude, "-#{currentRayOrigin} + vec3(#{cornerSize[0]}, #{cornerSize[1]}, #{cornerSize[2]})"
          dist = preludePop flags.glslPrelude
          codes = codes.concat ["#{dist}.x", "#{dist}.y", "#{dist}.z"]
          remainingHalfSpaces -= 3
        if remainingHalfSpaces > 0
          signs = [
            if hs[3] then '-' else '',
            if hs[4] then '-' else '',
            if hs[5] then '-' else '']
          preludePush flags.glslPrelude, "vec3(#{signs[0]}#{currentRayOrigin.x}, #{signs[1]}#{currentRayOrigin.y}, #{signs[2]}#{currentRayOrigin.z}) - vec3(#{signs[0]}#{cornerSize[0]}, #{signs[1]}#{cornerSize[1]}, #{signs[2]}#{cornerSize[2]})"
          codes.push preludePop flags.glslPrelude

      # Compile another corner if necessary
      # Pre-condition: remainingHalfSpaces < 3
      if remainingHalfSpaces == 1
        # TODO...
        #for index in [0..2] when hs[index] != null and hs[index + 3] != null
        #  
      else if remainingHalfSpaces == 2
        # TODO...
      else
        mecha.logInternalError "GLSL Compiler: Wrong number of halfspaces remain in corner compilation: #{remainingHalfSpaces}."

      # Calculate the maximum distances
      node.code = codes.shift()
      for c in codes
        node.code = "max(#{c}, #{node.code})"
      stack[0].nodes.push node
    translate: (stack, node, flags) ->  
      # Remove the modified ray origin from the prelude stack
      preludePop flags.glslPrelude
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
      for s in stack
        switch s.type
          when 'intersect'
            # Assign to the halfspace bins for corner compilation
            index = node.attr.axis + (if flags.invert then 3 else 0)
            if s.halfSpaces[index] == null or (if flags.invert then s.halfSpaces[index] < node.attr.val else s.halfSpaces[index] > node.attr.val)
              s.halfSpaces[index] = node.attr.val
          when 'union'
            # Assign to the halfspace bins for corner compilation
            index = node.attr.axis + (if flags.invert then 3 else 0)
            if s.halfSpaces[index] == null or (if flags.invert then s.halfSpaces[index] > node.attr.val else s.halfSpaces[index] < node.attr.val)
              s.halfSpaces[index] = node.attr.val
          when 'invert', 'mirror', 'translate'
            # TODO: modify the halfspace?
            continue # Search for preceding intersect/union node
          else 
            node.code = "#{node.attr.val} - #{flags.glslPrelude}[#{node.attr.axis}]"
        break
      stack[0].nodes.push node
    default: (stack, node, flags) ->
      stack[0].nodes.push node

  # TEMPORARY
  console.log abstractSolidModel

  # Compile the tree
  flags =
    invert: false
    glslFunctions: {}
    glslPrelude: [['ro', "#{rayOrigin}"]]
  flags.glslPrelude.code = ""
  flags.glslPrelude.counter = 0

  result = mapASM preDispatch, postDispatch, [{nodes: []}], abstractSolidModel, flags

  # TEMPORARY
  console.log result

  if result.nodes.length == 1
    result.nodes[0].code
  else
    mecha.logInternalError 'GLSL Compiler: Expected exactly one result node from compiler.'
    return ""

  program = prefix + (glslLibrary.compile flags.glslFunctions) + (sceneDist flags.glslPrelude.code, result.nodes[0].code) + sceneNormal + main
  console.log program
  return program

