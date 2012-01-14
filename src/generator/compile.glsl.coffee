# Compile the abstract solid model to GLSL for shaders

# TODO: Would be nice if CoffeeScript supported '''#{tag}''' syntax

compileGLSL = (abstractSolidModel) ->
  rayOrigin = 'ro'
  rayDirection = 'rd'
  usePerspectiveProjection = false
  
  ## TEMPORARY
  console.log "ASM:"
  console.log abstractSolidModel
  ##

  # Generate the vertex shader
  vertexShader = ->
    boundsResult = compileASMBounds abstractSolidModel
    if boundsResult.nodes.length != 1
      mecha.logInternalError 'GLSL Compiler: Expected exactly one result node from the bounding box compiler.'
    bounds = boundsResult.nodes[0].bounds
    
    ### TEMPORARY
    console.log "Bounds Result:"
    console.log boundsResult
    ###

    # TODO: Possibly change some of these to constants to uniforms later to avoid recompilation
    """
    const float Infinity = (1.0/0.0);
    const vec3 sceneScale = vec3(#{bounds[1][0] - bounds[0][0]}, #{bounds[1][1] - bounds[0][1]}, #{bounds[1][2] - bounds[0][2]});
    const vec3 sceneTranslation = vec3(#{bounds[0][0] + bounds[1][0]}, #{bounds[0][1] + bounds[1][1]}, #{bounds[0][2] + bounds[1][2]});
    uniform mat4 projection;
    uniform mat4 view;
    attribute vec3 position;
    varying vec3 modelPosition;
    #{if usePerspectiveProjection then "varying vec3 viewPosition;" else ""}
    void main(void) {
      modelPosition = position;
      #{if usePerspectiveProjection then "viewPosition = (view * vec4(position, 1.0)).xyz;" else ""}
      gl_Position = projection * view * vec4(position, 1.0);
    }
    
    """

  # Generate the fragment shader
  fragmentShader = ->
    distanceResult = glslSceneDistance abstractSolidModel
    if distanceResult.nodes.length != 1
      mecha.logInternalError 'GLSL Compiler: Expected exactly one result node from the distance compiler.'

    ## TEMPORARY
    console.log "Distance Result:"
    console.log distanceResult
    ##

    idResult = glslSceneId abstractSolidModel
    if idResult.nodes.length != 1
      mecha.logInternalError 'GLSL Compiler: Expected exactly one result node from the material id compiler.'

    ### TEMPORARY
    console.log "Id Result:"
    console.log idResult
    ###

    # Helpers
    sceneMaterial = (materials) ->
      binarySearch = (start, end) ->
        diff = end - start
        if diff == 1
          "m#{start}"
        else
          mid = start + Math.floor (diff * 0.5)
          "(id < #{mid}? #{binarySearch start, mid} : #{binarySearch mid, end})"

      result = "\nvec3 sceneMaterial(in vec3 ro) {\n  int id = sceneId(ro);\n"
      if materials.length > 0
        for i in [0...materials.length]
          m = materials[i]
          result += "  vec3 m#{i} = #{m};\n"
        result += "  return id >= 0? #{binarySearch 0, materials.length} : vec3(0.5);\n"
      else
        result += "  return vec3(0.5);\n"
      result += "}\n\n"
      result

    # Shader

    """
    #ifdef GL_ES
      precision highp float;
    #endif
    const float Infinity = (1.0/0.0);
    uniform mat4 view;
    varying vec3 modelPosition;
    #{if usePerspectiveProjection then "varying vec3 viewPosition;" else ""}

    #{glslLibrary.compile distanceResult.flags.glslFunctions}

    float sceneDist(in vec3 #{rayOrigin}) {
      #{distanceResult.flags.glslPrelude.code}  
      return max(0.0,#{distanceResult.nodes[0].code});
    }

    vec3 sceneNormal(in vec3 p) {
      const float eps = 0.00001;
      vec3 n;
      n.x = sceneDist( vec3(p.x+eps, p.yz) ) - sceneDist( vec3(p.x-eps, p.yz) );
      n.y = sceneDist( vec3(p.x, p.y+eps, p.z) ) - sceneDist( vec3(p.x, p.y-eps, p.z) );
      n.z = sceneDist( vec3(p.xy, p.z+eps) ) - sceneDist( vec3(p.xy, p.z-eps) );
      return normalize(n);
    }

    int sceneId(in vec3 #{rayOrigin}) {
      #{idResult.flags.glslPrelude.code}
      #{idResult.nodes[0].code};
      return #{idResult.nodes[0].code.materialId};
    }

    #{sceneMaterial idResult.flags.materials}
    
    void main(void) {
      const int steps = 64;
      const float threshold = 0.005;
      vec3 rayOrigin = modelPosition;
      vec3 rayDir = (vec4(0.0,0.0,-1.0,0.0) * view).xyz;
      vec3 prevRayOrigin = rayOrigin;
      bool hit = false;
      float dist = Infinity;
      //float prevDist = (1.0/0.0);
      //float bias = 0.0; // corrective bias for the step size
      //float minDist = (1.0/0.0);
      for(int i = 0; i < steps; i++) {
        //dist = sceneRayDist(rayOrigin, rayDir);
        //prevDist = dist;
        dist = sceneDist(rayOrigin);
        //minDist = min(minDist, dist);
        if (dist <= 0.0) {
          hit = true;
          break;
        }
        prevRayOrigin = rayOrigin;
        //rayOrigin += (max(dist, threshold) + bias) * rayDir;
        rayOrigin += max(dist, threshold) * rayDir;
        if (all(notEqual(clamp(rayOrigin, vec3(-1.0), vec3(1.0)), rayOrigin))) { break; }
      }
      vec3 absRayOrigin = abs(rayOrigin);
      //if(!hit && max(max(absRayOrigin.x, absRayOrigin.y), absRayOrigin.z) >= 1.0) { discard; }
      //if(!hit && prevDist >= dist) { discard; }
      if(!hit) { discard; }
      //if(!hit) { gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0); return; }
      //const vec3 diffuseColor = vec3(0.1, 0.2, 0.8);
      vec3 diffuseColor = sceneMaterial(prevRayOrigin);
      //const vec3 specularColor = vec3(1.0, 1.0, 1.0);
      const vec3 lightPos = vec3(1.5,1.5, 4.0);
      vec3 ldir = normalize(lightPos - prevRayOrigin);
      vec3 diffuse = diffuseColor * dot(sceneNormal(prevRayOrigin), ldir);
      gl_FragColor = vec4(diffuse, 1.0);
    }

    """

  shaders = [vertexShader(), fragmentShader()]
  return shaders

