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
  
  compileIntersect = (node, flags, glslFunctions, glslCode) ->
    rayOrigin = 'ro'

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

    for node in node.nodes
      switch node.type
        when 'intersect'
          mecha.logInternalError "GLSL Compiler: Intersect nodes should not be directly nested, expected intersect nodes to be flattened by the ASM compiler."
        when 'mirror'
          oldFlags = flags
          glslCode = 
            switch node.args.axes.length
              when 3 then glslCode = "abs(#{positionParam})"
              when 1
                switch node.args.axes[0]
                  when 0 then "vec3(abs(#{positionParam}.x), #{positionParam}.yz)"
                  when 1 then "vec3(#{positionParam}.x, abs(#{positionParam}.y), #{positionParam}.z)"
                  when 2 then "vec3(#{positionParam}.xy, abs(#{positionParam}.z))"
                  else 
                    mecha.logInternalError "GLSL Compiler: Unknown axis #{node.args.axes[0]} in mirror node."
                    "#{positionParam}"
              when 2
                if node.args.axes[0] != 0 and node.args.axes[1] != 0
                  "vec3(#{positionParam}.x, abs(#{positionParam}.yz)"
                else if node.args.axes[0] != 1 and node.args.axes[1] != 1
                  "vec3(abs(#{positionParam}.x), (#{positionParam}.y, abs(#{positionParam}.z))"
                else
                  "vec3(abs(#{positionParam}.xy), #{positionParam}.z)"
              else 
                mecha.logInternalError "GLSL Compiler: Mirror node has #{node.args.axes.length} axes, expected between 1 and 3."
                "#{positionParam}"
        else
          mecha.logInternalError "GLSL Compiler: Could not compile unknown node with type #{node.type}."
    
    # Collect half-spaces into bins by type [x+, x-, y+, y-, z+, z-]
    # TODO: Possibly this code should be moved to the ASM compilation module...
    halfSpaceBins = []
    halfSpaceBins.push [] for i in [0..5]
    collectASM.intersect node.nodes, flags, halfSpaceBins
    if halfSpaceBins[0].length > 0 and halfSpaceBins[1].length > 0 and halfSpaceBins[2].length > 0
      glslFunctions.corner = true
      positionParam = "#{rayOrigin}"
      glslCode = "#{glslLibrary.distanceFunctions.cornerDist.id}(#{positionParam}), vec3(#{boundaries[3] - center[0]}, #{boundaries[4] - center[1]}, #{boundaries[5] - center[2]}))"

    #TODO: if halfSpaceBins[3].length > 0 and halfSpaceBins[4].length > 0 and halfSpaceBins[5].length > 0

  compileNode = (node, flags, glslFunctions, glslCode) ->
    switch node.type
      when 'union' 
        compileNode['unionDist'] = true
        compileNode n for n in node.nodes
        mecha.logInternalError "GLSL Compiler: BUSY HERE... (compile union node)"
      when 'intersect'
        compileIntersect node, flags, glslFunctions
      else
        mecha.logInternalError "GLSL Compiler: Could not compile unknown node with type #{node.type}."
        glslINFINITY = '1.0/0.0'
        glslCode = "#{glslINFINITY}"

  glslFunctions = {}
  glslCode = ""
  flags = { invert: false, mirror: [] }
  compileNode abstractSolidModel, flags, glslFunctions, glslCode
  return prefix + (glslLibrary.compile glslFunctions) + (sceneDist glslCode) + sceneNormal + main

