compileGLSL = (abstractSolidModel) ->
  '''
  #ifdef GL_ES
    precision highp float;
  #endif

  //attribute vec3 SCENEJS_aVertex;           // Model coordinates
  uniform vec3 SCENEJS_uEye;                  // World-space eye position
  varying vec3 SCENEJS_vEyeVec;               // Output world-space eye vector
  // attribute vec3 SCENEJS_aNormal;          // Normal vectors
  // uniform   mat4 SCENEJS_uMNMatrix;        // Model normal matrix
  // uniform   mat4 SCENEJS_uVNMatrix;        // View normal matrix
  // varying   vec3 SCENEJS_vWorldNormal;     // Output world-space vertex normal
  // varying   vec3 SCENEJS_vViewNormal;      // Output view-space vertex normal
  // uniform vec3 SCENEJS_uLightDir0;
  // uniform vec4 SCENEJS_uLightPos0;
  // uniform vec4 SCENEJS_uLightPos0;
  // varying vec4 SCENEJS_vLightVecAndDist0;  // varying for fragment lighting
  // attribute vec2 SCENEJS_aUVCoord;         // UV coords
  // attribute vec2 SCENEJS_aUVCoord2;        // UV2 coords
  // attribute vec4 SCENEJS_aVertexColor;     // UV2 coords
  // varying vec4 SCENEJS_vColor;             // Varying for fragment texturing
  // uniform mat4 SCENEJS_uMMatrix;           // Model matrix
  // uniform mat4 SCENEJS_uVMatrix;           // View matrix
  // uniform mat4 SCENEJS_uPMatrix;           // Projection matrix
  varying vec4 SCENEJS_vWorldVertex;          // Varying for fragment clip or world pos hook
  // varying vec4 SCENEJS_vViewVertex;        // Varying for fragment view clip hook
  // varying vec2 SCENEJS_vUVCoord;
  // varying vec2 SCENEJS_vUVCoord2;
  uniform float radius;
  
  float sphereRayDist(in vec3 p, in float r, in vec3 d) {
    return length(p)-r;
  }
  float sphereDist(in vec3 p, in float r) {
    return length(p)-r;
  }
  float boxDist(in vec3 p, in vec3 c, in vec3 r) {
    vec3 rel = abs(p - c);
    if (all(lessThan(rel, r)))
      return 0.0;
    vec3 d = max(vec3(0.0), rel - r);
    return max(max(d.x, d.y), d.z);
  }
  float box_chamferDist(in vec3 p, in vec3 c, in vec3 r, in float cr) {
    vec3 rel = abs(p - c);
    vec3 d = max(vec3(0.0), rel - r);

    // Optimization: Approximation
    //if (any(greaterThan(rel, r + vec3(cr)))) { return max(max(d.x, d.y), d.z); }

    // Quick inner box test (might not be necessary if we assume camera is outside bounding box)
    vec3 cr_center = r - vec3(cr);
    bvec3 gtCrCenter = greaterThan(rel, cr_center);
    if (!any(gtCrCenter)) { return 0.0; }

    // Distance to box sides (if at least two dimensions are inside the inner box)
    vec3 dcr = rel - cr_center;
    if (min(dcr.x, dcr.y) < 0.0 && min(dcr.x, dcr.z) < 0.0 && min(dcr.y, dcr.z) < 0.0) { return max(max(d.x, d.y), d.z); }

    // Distance to corner chamfer
    float dcr_length;
    if (all(gtCrCenter)) {
      dcr_length = length(dcr);
    }
    // Distance to edge chamfer
    else if(dcr.x < 0.0) {
      dcr_length = length(dcr.yz);
    }
    else if (dcr.y < 0.0) {
      dcr_length = length(dcr.xz);
    }
    else { // dcr.z < 0.0
      dcr_length = length(dcr.xy);
    }
    if (dcr_length < cr) { return 0.0; }
    return dcr_length - cr;
  }
  float _intersect(in float a, in float b) {
    return max(a,b);
  }
  float _difference(in float a, in float b) {
    return max(a,-b);
  }
  float _union(in float a, in float b) {
    return min(a,b);
  }
  
  float sceneDist(in vec3 rayOrigin){
    /*return sphereDist(vec3(0.0,0.0,0.0)-rayOrigin, 0.99);*/
    float b = box_chamferDist(rayOrigin, vec3(0.0), vec3(0.55), 0.1);
    float s1 = sphereDist(rayOrigin - vec3(0.3,0.0,0.1), 0.59);
    float s2 = sphereDist(rayOrigin - vec3(-0.3,0.0,-0.1), 0.59);
    return b;
    return _union(
      _intersect(s1, b),
      _intersect(s2, b));
    /*return _union(
      sphereDist(rayOrigin - vec3(0.5,0.0,0.0), 0.49),
      sphereDist(rayOrigin - vec3(-0.5,0.0,0.0), 0.49));*/
    /*return _difference(sphereDist(vec3(0.5,0.0,0.0) - rayOrigin, 0.49), sphereDist(vec3(-0.5,0.0,0.0) - rayOrigin, 0.49));*/
  }
  
  float sceneRayDist(in vec3 rayOrigin, in vec3 rayDir) {
    /*return sceneRayDist(vec3(0.0,0.0,0.0)-rayOrigin, 0.99, rayDir);*/
    return _union(
      _union(sphereRayDist(rayOrigin - vec3(0.5,0.0,0.0), 0.49, rayDir), boxDist(rayOrigin, vec3(0.0), vec3(0.3))),
      sphereRayDist(rayOrigin - vec3(-0.5,0.0,0.0), 0.49, rayDir));
    /*return _difference(rayOrigin - sceneRayDist(vec3(0.5,0.0,0.0), 0.49, rayDir), sceneRayDist(rayOrigin - vec3(-0.5,0.0,0.0), 0.49, rayDir));*/
  }
  
  vec3 sceneNormal( in vec3 pos )
  {
    const float eps = 0.0001;
    vec3 n;
    n.x = sceneDist( vec3(pos.x+eps, pos.yz) ) - sceneDist( vec3(pos.x-eps, pos.yz) );
    n.y = sceneDist( vec3(pos.x, pos.y+eps, pos.z) ) - sceneDist( vec3(pos.x, pos.y-eps, pos.z) );
    n.z = sceneDist( vec3(pos.xy, pos.z+eps) ) - sceneDist( vec3(pos.xy, pos.z-eps) );
    return normalize(n);
  }
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

###
# Compile the abstract solid model tree into a GLSL string
glslFunctions =
  'b':
    verbose: 'box'
    arguments: ['in vec3 p', 'in vec3 c', 'in vec3 r', 'in cr']
    code: 
      '''
      vec3 rel = abs(p - c);
      if (any(lessThan(rel, r)))
        return 0;
      vec3 d = rel - r;
      return min(d.x, d.y, d.z);
      '''
###

