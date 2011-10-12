# Compile the abstract solid model tree into a GLSL string
compileGLSL: (abstractSolidModel) ->
  '''
  uniform float radius;
  float sceneRayDist(in vec3 p, in float r, in vec3 d) {
    return length(p)-r;
  }
  float sphereDist(in vec3 p, in float r) {
    return length(p)-r;
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
    return _union(sphereDist(rayOrigin - vec3(0.5,0.0,0.0), 0.49), sphereDist(rayOrigin - vec3(-0.5,0.0,0.0), 0.49));
    /*return _difference(sphereDist(vec3(0.5,0.0,0.0) - rayOrigin, 0.49), sphereDist(vec3(-0.5,0.0,0.0) - rayOrigin, 0.49));*/
  }
  
  float sceneRayDist(in vec3 rayOrigin, in vec3 rayDir) {
    /*return sceneRayDist(vec3(0.0,0.0,0.0)-rayOrigin, 0.99, rayDir);*/
    return _union(sceneRayDist(rayOrigin - vec3(0.5,0.0,0.0), 0.49, rayDir), sceneRayDist(rayOrigin - vec3(-0.5,0.0,0.0), 0.49, rayDir));
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
  void foo(void) {
    const int steps = 64;
    const float threshold = 0.01;
    vec3 rayDir = /*normalize*/(/*SCENEJS_uMMatrix * */SCENEJS_vEyeVec);
    vec3 rayOrigin = SCENEJS_vWorldVertex.xyz;
    bool hit = false;
    float dist = 0.0;
    for(int i = 0; i < steps; i++) {
      dist = sceneRayDist(rayOrigin, rayDir);
      if (dist < threshold) {
        hit = true;
        break;
      }
      rayOrigin += dist * rayDir;
    }
    
    if(!hit) { discard; }
    /*if(!hit) { gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0); return; }*/
    
    const vec3 diffuseColor = vec3(0.1, 0.2, 0.8);
    const vec3 lightPos = vec3(0.8,4.0, 0.8);
    vec3 ldir = normalize(lightPos - rayOrigin);
    vec3 diffuse = diffuseColor * dot(sceneNormal(rayOrigin), ldir);
    gl_FragColor = vec4(diffuse, 1.0);
  }
  '''

