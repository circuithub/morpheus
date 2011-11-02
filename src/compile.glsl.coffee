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
  
  sceneDist = (code) ->
    # ro = ray origin
    "\nfloat sceneDist(in vec3 ro){ return #{code}; }\n\n"
  
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
  match = (node, pattern) ->
    subpattern = pattern[node.type]
    #if subpattern?
    #  return match node, subpattern
  
  compileIntersect = (node, flags, glslFunctions, glslCodes) ->
    rayOrigin = 'ro'

    collectIntersectNodes = (nodes, flags, halfSpaceBins) ->
      for node in nodes
        switch node.type
          when 'halfspace' 
            halfSpaceBins[node.attr.axis + (if flags.invert then 3 else 0)].push node.attr.val
          when 'intersect' 
            mecha.logInternalError "GLSL Compiler: Intersect nodes should not be directly nested expected intersect nodes to be flattened ASM compiler."
          when 'invert'
            flags.invert = not flags.invert
            collectIntersectNodes node.nodes, flags, halfSpaceBins
            flags.invert = not flags.invert
          else
            mecha.logInternalError "GLSL Compiler: Unsuppported node type, '#{node.type}', inside intersection."

    if node.nodes.length == 0
      mecha.logInternalError 'GLSL Compiler: Intersect nodes should not be empty.'
      return
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

  compileNode = (node, flags, glslFunctions) ->
    switch node.type
      when 'union' 
        compileNode['unionDist'] = true
        compileNode n for n in node.nodes
        mecha.logInternalError "GLSL Compiler: BUSY HERE... (compile union node)"
      when 'intersect'
        #match node,
        #  type: 'intersect'
        #  nodes: [
        #    type: 'halfspace'
        #    attr: attr
        #  ,
        #    type: 'halfspace'
        #    attr: attr
        #  ,
        #    type: 'halfspace'
        #    attr: attr
        #  ]
        #compileNode['intersectDist'] = true
        compileIntersect node, flags, glslFunctions
      else
        glslINFINITY = '1.0/0.0'
        return "#{glslINFINITY}"

  glslFunctions = {}
  glslCode = ""
  flags = { invert: false }
  glslCode = compileNode abstractSolidModel, flags, glslFunctions
  return prefix + (glslLibrary.compile glslFunctions) + (sceneDist glslCode) + sceneNormal + main

