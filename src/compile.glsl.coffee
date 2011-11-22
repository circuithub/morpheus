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
    "\nfloat sceneDist(in vec3 #{rayOrigin}){\n#{prelude}  return max(0.0,#{code});\n}\n\n"
  
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
      ro = flags.glslPrelude[flags.glslPrelude.length-1][0] # Current ray origin
      preludePush flags.glslPrelude, "#{ro} - vec3(#{node.attr.offset[0]}, #{node.attr.offset[1]}, #{node.attr.offset[2]})"
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
      preludePush flags.glslPrelude, "#{roWithSigns} - #{cornerWithSigns}"
      dist = preludePop flags.glslPrelude
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
            when 'translate','mirror','invert'
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
        node.code = "min(#{c}, #{node.code})"
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
            when 'translate','mirror','invert'
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

