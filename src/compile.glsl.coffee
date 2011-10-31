# Compile the abstract solid model to GLSL for shaders

# TODO: Would be nice if CoffeeScript supported '''#{tag}''' syntax

compileGLSL = (abstractSolidModel) ->
  distanceFunctions = 
    sphereDist:
      id: '__sphereDist'
      returnType: 'float'
      arguments: ['vec3', 'float']
      code: do () ->
        position = 'a'
        radius = 'b'
        [
          "return length(#{position}) - #{radius};"
        ]
    boxDist:
      id: '__boxDist'
      arguments: ['vec3', 'vec3']
      code: do () ->
        position = 'a'
        radius = 'b'
        rel = 'r'
        dist = 's'
        [
          "if (all(lessThan(#{position}, #{radius})))"
          "  return 0.0;"
          "vec3 #{dist} = max(vec3(0.0), #{rel} - #{position});"
          "return max(max(#{dist}.x, #{dist}.y), #{dist}.z);"
        ]
    boxChamferDist:
      id: '__boxChamferDist'
      arguments: ['vec3', 'vec3', 'vec3', 'float']
      code: do () ->
        position = 'a'
        center = 'b'
        radius = 'c'
        chamferRadius = 'd'
        rel = 'r'
        dist = 's'
        chamferCenter = 'cc'
        chamferDist = 'ccd'
        chamferDistLength = 'ccdl'
        gtChamferCenter = 'gtcc'   # Greater than chamfer center
        [
          "vec3 #{rel} = abs(#{position} - #{center});"
          "vec3 #{dist} = max(vec3(0.0), #{rel} - #{center});"
          
          # Optimization: Approximation
          "if (any(greaterThan(#{rel}, #{center} + vec3(#{chamferRadius})))) { return max(max(#{dist}.x, #{dist}.y), #{dist}.z); }"

          # Quick inner box test (might not be necessary if we assume camera is outside bounding box)
          "vec3 #{chamferCenter} = #{radius} - vec3(#{chamferRadius});"
          "bvec3 #{gtChamferCenter} = greaterThan(#{rel}, #{chamferCenter});"
          "if (!any(#{gtChamferCenter})) { return 0.0; }"

          # Distance to box sides (if at least two dimensions are inside the inner box)
          "vec3 #{chamferDist} = #{rel} - #{chamferCenter};"
          "if (min(#{chamferDist}.x, #{chamferDist}.y) < 0.0 && min(#{chamferDist}.x, #{chamferDist}.z) < 0.0 && min(#{chamferDist}.y, #{chamferDist}.z) < 0.0)"
          "{ return max(max(#{dist}.x, #{dist}.y), #{dist}.z); }"

          # Distance to corner chamfer
          "float #{chamferDistLength};"
          "if (all(#{gtChamferCenter})) {"
          "  #{chamferDistLength} = length(#{chamferDist});"
          "}"

          # Distance to edge chamfer
          "else if(#{chamferDist}.x < 0.0) {"
          "  #{chamferDistLength} = length(#{chamferDist}.yz);"
          "}"
          "else if (#{chamferDist}.y < 0.0) {"
          "  #{chamferDistLength} = length(#{chamferDist}.xz);"
          "}"
          "else { // #{chamferDist}.z < 0.0"
          "  #{chamferDistLength} = length(#{chamferDist}.xy);"
          "}"
          "return min(#{chamferDistLength} - #{chamferRadius}, 0.0);"
        ]
      intersectDist:
        id: '__intersectDist'
        arguments: ['float', 'float']
        code: ["return max(a,b);"]
      differenceDist:
        id: '__differenceDist'
        arguments: ['float','float']
        code: ["return max(a,-b);"]
      unionDist:
        id: '__unionDist'
        arguments: ['float','float']
        code: ["return min(a,b);"]

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
    rayPosition = 'rp'

    collectIntersectNodes = (nodes, flags, halfSpacesByType) ->
      for node in nodes
        switch node.type
          when 'halfspace' then halfSpacesByType[node.attr.axis + (if flags.invert then 3 else 0)].push node.attr.val
          when 'invert'
            flags.invert = not flags.invert
            halfSpacesByType = collectIntersectNodes node.nodes, flags, halfSpacesByType
            flags.invert = not flags.invert
      return halfSpacesByType

    if node.nodes.length == 0
      return
    # Try to find a half-space "corner" (three halfspaces on x,y,z axes that intersect
    # Prefer a x+,y+,z+ corner first, then x-,y-,z- corner then all other corners
    # I.e.
    #
    # -  ____     and     +  |       respectively
    #   |                ____|     
    #   |  +                   -
    
    # Collect half-spaces into bins by type [x+, x-, y+, y-, z+, z-]
    halfSpacesByType = []
    halfSpacesByType.push [] for i in [0..5]
    halfSpacesByType = collectIntersectNodes node.nodes, flags, halfSpacesByType
    if halfSpacesByType[0].length > 0 and halfSpacesByType[1].length > 0 and halfSpacesByType[2].length > 0
      if halfSpacesByType[3].length > 0 and halfSpacesByType[4].length > 0 and halfSpacesByType[5].length > 0
        glslFunctions.box = true
        boundaries = []
        boundaries.push spaces.reduce Math.max for spaces in halfSpacesByType[0..2]
        boundaries.push spaces.reduce Math.min for spaces in halfSpacesByType[3..5]
        center = [boundaries[0] + boundaries[3], boundaries[1] + boundaries[4], boundaries[2] + boundaries[5]]
        positionParam = "#{rayPosition}"
        if center[0] != 0.0 or center[1] != 0.0 or center[2] != 0.0
          positionParam += " - vec3(#{center[0]},#{center[1]},#{center[2]})"
        glslCode = "#{distanceFunctions.boxDist.id}(#{positionParam})"

  compileNode = (node, flags, glslFunctions) ->
    switch node.type
      when 'union' 
        compileNode['unionDist'] = true
        compileNode n for n in node.nodes
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
  return prefix + (sceneDist glslCode) + sceneNormal + main

