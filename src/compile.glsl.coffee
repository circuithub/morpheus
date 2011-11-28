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

  sceneId = (prelude, code) ->
    "\nint sceneId(in vec3 #{rayOrigin}) {\n  int id = -1;\n#{prelude}  #{code};\n  return id;\n}\n\n"

  sceneMaterial = () ->
    # ro = ray origin
    '''
    vec3 sceneMaterial(in vec3 ro) {
      int id = sceneId(ro);
      return id == 1? vec3(0.2, 0.8, 0.1) :
             id == 2? vec3(0.8, 0.2, 0.1) :
             id > 2? vec3(0.8, 0.8, 0.1) : vec3(0.1, 0.2, 0.8);
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
  
  # TEMPORARY
  console.log "ASM:"
  console.log abstractSolidModel

  distanceResult = glslSceneDistance abstractSolidModel

  # TEMPORARY
  console.log "Distance Result:"
  console.log distanceResult

  if distanceResult.nodes.length == 1
    distanceResult.nodes[0].code
  else
    mecha.logInternalError 'GLSL Compiler: Expected exactly one result node from distance compiler.'
    return ""

  idResult = glslSceneId abstractSolidModel

  # TEMPORARY
  console.log "Id Result:"
  console.log idResult

  if idResult.nodes.length == 1
    idResult.nodes[0].code
  else
    mecha.logInternalError 'GLSL Compiler: Expected exactly one result node from id compiler.'
    return ""

  program = prefix + 
    (glslLibrary.compile distanceResult.flags.glslFunctions) +
    (sceneDist distanceResult.flags.glslPrelude.code, distanceResult.nodes[0].code) +
    sceneNormal +
    (sceneId idResult.flags.glslPrelude.code, idResult.nodes[0].code) +
    sceneMaterial() +
    main
  console.log program
  return program

