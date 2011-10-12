# Compile the abstract solid model tree into a GLSL string
compileGLSL: (abstractSolidModel) ->
  "uniform float radius;\n\
  float sceneRayDist(in vec3 p, in float r, in vec3 d) {\n\
    return length(p)-r;\n\
  }\n\
  float sphereDist(in vec3 p, in float r) {\n\
    return length(p)-r;\n\
  }\n\
  float _intersect(in float a, in float b) {\n\
    return max(a,b);\n\
  }\n\
  float _difference(in float a, in float b) {\n\
    return max(a,-b);\n\
  }\n\
  float _union(in float a, in float b) {\n\
    return min(a,b);\n\
  }\n\
  \n\
  float sceneDist(in vec3 rayOrigin){\n\
    /*return sphereDist(vec3(0.0,0.0,0.0)-rayOrigin, 0.99);*/\n\
    return _union(sphereDist(rayOrigin - vec3(0.5,0.0,0.0), 0.49), sphereDist(rayOrigin - vec3(-0.5,0.0,0.0), 0.49));\n\
    /*return _difference(sphereDist(vec3(0.5,0.0,0.0) - rayOrigin, 0.49), sphereDist(vec3(-0.5,0.0,0.0) - rayOrigin, 0.49));*/\n\
  }\n\
  \n\
  float sceneRayDist(in vec3 rayOrigin, in vec3 rayDir) {\n\
    /*return sceneRayDist(vec3(0.0,0.0,0.0)-rayOrigin, 0.99, rayDir);*/\n\
    return _union(sceneRayDist(rayOrigin - vec3(0.5,0.0,0.0), 0.49, rayDir), sceneRayDist(rayOrigin - vec3(-0.5,0.0,0.0), 0.49, rayDir));\n\
    /*return _difference(rayOrigin - sceneRayDist(vec3(0.5,0.0,0.0), 0.49, rayDir), sceneRayDist(rayOrigin - vec3(-0.5,0.0,0.0), 0.49, rayDir));*/\n\
  }\n\
  \n\
  vec3 sceneNormal( in vec3 pos )\n\
  {\n\
    const float eps = 0.0001;\n\
    vec3 n;\n\
    n.x = sceneDist( vec3(pos.x+eps, pos.yz) ) - sceneDist( vec3(pos.x-eps, pos.yz) );\n\
    n.y = sceneDist( vec3(pos.x, pos.y+eps, pos.z) ) - sceneDist( vec3(pos.x, pos.y-eps, pos.z) );\n\
    n.z = sceneDist( vec3(pos.xy, pos.z+eps) ) - sceneDist( vec3(pos.xy, pos.z-eps) );\n\
    return normalize(n);\n\
  }\n\
  void foo(void) {\n\
    const int steps = 64;\n\
    const float threshold = 0.01;\n\
    vec3 rayDir = /*normalize*/(/*SCENEJS_uMMatrix * */SCENEJS_vEyeVec);\n\
    vec3 rayOrigin = SCENEJS_vWorldVertex.xyz;\n\
    bool hit = false;\n\
    float dist = 0.0;\n\
    for(int i = 0; i < steps; i++) {\n\
      dist = sceneRayDist(rayOrigin, rayDir);\n\
      if (dist < threshold) {\n\
        hit = true;\n\
        break;\n\
      }\n\
      rayOrigin += dist * rayDir;\n\
    }\n\
    \n\
    if(!hit) { discard; }\n\
    /*if(!hit) { gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0); return; }*/\n\
    \n\
    const vec3 diffuseColor = vec3(0.1, 0.2, 0.8);\n\
    const vec3 lightPos = vec3(0.8,4.0, 0.8);\n\
    vec3 ldir = normalize(lightPos - rayOrigin);\n\
    vec3 diffuse = diffuseColor * dot(sceneNormal(rayOrigin), ldir);\n\
    gl_FragColor = vec4(diffuse, 1.0);\n\
  }\n"
