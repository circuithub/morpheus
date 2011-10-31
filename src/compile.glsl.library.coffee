glslLibrary = 
  distanceFunctions:
    sphereDist:
      id: '_sphereDist'
      returnType: 'float'
      arguments: ['vec3', 'float']
      code: do () ->
        position = 'a'
        radius = 'b'
        [
          "return length(#{position}) - #{radius};"
        ]
    boxDist:
      id: '_boxDist'
      returnType: 'float'
      arguments: ['vec3', 'vec3']
      code: do () ->
        position = 'a'
        radius = 'b'
        dist = 's'
        [
          "if (all(lessThan(#{position}, #{radius})))"
          "  return 0.0;"
          "vec3 #{dist} = max(vec3(0.0), #{position} - #{radius});"
          "return max(max(#{dist}.x, #{dist}.y), #{dist}.z);"
        ]
    boxChamferDist:
      id: '_boxChamferDist'
      returnType: 'float'
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
  compile: (libraryFunctions) ->
    code = ""
    for f,v of libraryFunctions
      # if not v then continue
      distanceFunction = @distanceFunctions[f + 'Dist']
      if not distanceFunction
        mecha.log "GLSL distance function '#{f}Dist' could not be found."
        continue
      code += '\n'
      code += "#{distanceFunction.returnType} #{distanceFunction.id}("
      charCodeA = 'a'.charCodeAt 0
      for i in [0...distanceFunction.arguments.length]
        argCharCode = charCodeA + i
        argName = String.fromCharCode argCharCode
        code += "in #{distanceFunction.arguments[i]} #{argName}"
        code += ',' if i < distanceFunction.arguments.length - 1
      code += ") {\n"
      code += c + '\n' for c in distanceFunction.code
      code += "}\n"
    return code
