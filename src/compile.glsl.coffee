# Compile the abstract solid model to GLSL for shaders

# TODO: Would be nice if CoffeeScript supported '''#{tag}''' syntax

compileGLSL = (abstractSolidModel) ->
  rayOrigin = 'ro'
  rayDirection = 'rd'

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

  # TODO: See if we can also do anti-aliasing using the information gathered for the scene normal
  #       Perhaps calculate some kind of rough pixel coverage information...
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

  sceneId = (prelude, code, id) ->
    "\nint sceneId(in vec3 #{rayOrigin}) {\n#{prelude}  #{code};\n  return #{code.materialId};\n}\n\n"

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

  fragmentShaderMain = 
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
        if (clamp(rayOrigin, vec3(-1.0), vec3(1.0)) != rayOrigin) { break; }
      }
      if(!hit) { discard; }
      //if(!hit) { gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0); return; }
      //const vec3 diffuseColor = vec3(0.1, 0.2, 0.8);
      vec3 diffuseColor = sceneMaterial(rayOrigin);
      //const vec3 specularColor = vec3(1.0, 1.0, 1.0);
      const vec3 lightPos = vec3(1.5,1.5, 4.0);
      vec3 ldir = normalize(lightPos - rayOrigin);
      vec3 diffuse = diffuseColor * dot(sceneNormal(rayOrigin), ldir);
      gl_FragColor = vec4(diffuse, 1.0);
    }
    
    '''
  
  vertexShaderMain = (bounds) ->
    # TODO: Possibly change these to uniforms later to avoid recompilation
    "const vec3 sceneScale = vec3(#{bounds[1][0] - bounds[0][0]}, #{bounds[1][1] - bounds[0][1]}, #{bounds[1][2] - bounds[0][2]});\n" +
    "const vec3 sceneTranslation = vec3(#{bounds[0][0] + bounds[1][0]}, #{bounds[0][1] + bounds[1][1]}, #{bounds[0][2] + bounds[1][2]});\n" +
    '''
    uniform mat4 projection;
    uniform mat4 modelView;
    attribute vec3 position;

    void main(void) {
      gl_Position = projection * modelView * vec4(position, 1.0);
    }
    
    '''

  ## TEMPORARY
  console.log "ASM:"
  console.log abstractSolidModel
  ##

  # Generate the fragment shader

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

  ## TEMPORARY
  console.log "Id Result:"
  console.log idResult
  ##

  fragmentShader = prefix + 
    (glslLibrary.compile distanceResult.flags.glslFunctions) +
    (sceneDist distanceResult.flags.glslPrelude.code, distanceResult.nodes[0].code) +
    sceneNormal +
    (sceneId idResult.flags.glslPrelude.code, idResult.nodes[0].code) +
    (sceneMaterial idResult.flags.materials) +
    fragmentShaderMain

  ## TEMPORARY
  console.log fragmentShader
  ##

  # Generate the vertex shader
  
  boundsResult = compileASMBounds abstractSolidModel
  if boundsResult.nodes.length != 1
    mecha.logInternalError 'GLSL Compiler: Expected exactly one result node from the bounding box compiler.'

  ## TEMPORARY
  console.log "Bounds Result:"
  console.log boundsResult
  ##

  vertexShader = vertexShaderMain boundsResult.nodes[0].bounds

  ## TEMPORARY
  console.log vertexShader
  ##

  return [vertexShader, fragmentShader]

