# The GLSL builder API (This builder produces strings rather than a tree)

glsl = do ->
  isArrayType = (a, typeString) ->
    for element in a
      if typeof element != typeString
        return false
    return true

  api =
    index: (a, index) ->
      if (Array.isArray a)
        return a[index]
      else
        "#{a}[#{index}]"

    floor: (a) ->
      if (Array.isArray a) and (isArrayType a, 'number')
        (Math.floor ai) for ai in a
      else if typeof a == 'number'
        Math.floor a
      else
        "floor(#{glsl.literal a})"

    fract: (a) ->
      if (Array.isArray a) and (isArrayType a, 'number')
        (ai - Math.floor ai) for ai in a
      else if typeof a == 'number'
        a - Math.floor a
      else
        "fract(#{glsl.literal a})"

    abs: (a) ->
      if (Array.isArray a) and (isArrayType a, 'number')
        (Math.abs ai) for ai in a
      else if typeof a == 'number'
        Math.abs a
      else
        "abs(#{glsl.literal a})"

    cos: (a) ->
      if typeof a == 'number'
        Math.cos a
      else
        "cos(#{a})"
    
    sin: (a) ->
      if typeof a == 'number'
        Math.sin a
      else
        "sin(#{a})"
    
    dot: (a, b) ->
      if typeof a == 'string' or typeof b == 'string'
        "dot(#{a}, #{b})"
      else if (Array.isArray a) and (Array.isArray b)
        if a.length != b.length
          throw "Cannot perform dot product operation with array operands of different lengths."
        if a.length < 2 or a.length > 4
          throw "Cannot perform dot product operation on vectors of #{a.length} dimensions."
        if (isArrayType a, 'number') and (isArrayType b, 'number')
          result = 0.0
          for i in [0...a.length]
            result += a[i] * b[i]
          return result
        else
          "dot(#{glsl.vecLit a}, #{glsl.vecLit b})"
      else 
        throw "Cannot perform dot product operation on operands with types '#{typeof a}' and '#{typeof b}'."

    cross: (a, b) ->
      if typeof a == 'string' or typeof b == 'string'
        "cross(#{a}, #{b})"
      else if (Array.isArray a) and (Array.isArray b)
        if a.length != b.length
          throw "Cannot perform cross product operation with array operands of different lengths."
        if a.length != 3
          throw "Cannot perform cross product operation on vectors of #{a.length} dimensions."
        if (isArrayType a, 'number') and (isArrayType b, 'number')
          [ a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0] ]
        else
          "cross(#{glsl.vec3Lit a}, #{glsl.vec3Lit b})"
      else 
        throw "Cannot perform cross operation on operands with types '#{typeof a}' and '#{typeof b}'."

    length: (a) ->
      if (isArrayType a, 'number')
        Math.sqrt (glsl.dot a,a)
      else
        "length(#{glsl.vecLit axis})"
    
    mul: (a, b) ->
      if typeof a == 'number' and typeof b == 'number'
        a * b
      else if typeof a == 'number'
        switch a
          when 0 then 0
          when 1 then b
          when -1 then glsl.neg b
          else
            if (Array.isArray b) and (isArrayType b, 'number')
              (a * b[i]) for i in [0...b.length]
            else
              # Number must not be integers (bitwise op converts operand to integer)
              "#{glsl.floatLit a} * #{glsl.literal b}"
      else if typeof b == 'number'
        switch b
          when 0 then 0
          when 1 then a
          when -1 then glsl.neg a
          else 
            if (Array.isArray a) and (isArrayType a, 'number')
              (a[i] * b) for i in [0...a.length]
            else
              # Number must not be integers (bitwise op converts operand to integer)
              "#{glsl.literal a} * #{glsl.floatLit b}"
      else if (Array.isArray a) and (Array.isArray b)
        if a.length != b.length
          throw "Cannot perform multiply operation with array operands of different lengths."
        if (isArrayType a, 'number') and (isArrayType b, 'number')
          (a[i] * b[i]) for i in [0...a.length]
        else
          "#{glsl.vecLit a} * #{glsl.vecLit b}"
      else 
        "#{glsl.literal a} * #{glsl.literal b}"

    mod: (a, b) ->
      if typeof a == 'number' and typeof b == 'number'
        a % b
      else if (Array.isArray a) and (Array.isArray b)
        if a.length != b.length
          throw "Cannot perform modulo operation with array operands of different lengths."
        if (isArrayType a, 'number') and (isArrayType b, 'number')
          (a[i] % b[i]) for i in [0...a.length]
        else
          "mod(#{glsl.vecLit a},#{glsl.vecLit b})"
      else if typeof a == 'number'
        switch a
          when 0 then 0
          else 
            # Number must not be integers (bitwise op converts operand to integer)
            "mod(#{glsl.floatLit a},#{glsl.literal b})"
      else if typeof b == 'number'
        switch b
          when 0 then NaN
          else 
            # Number must not be integers (bitwise op converts operand to integer)
            "mod(#{glsl.literal a},#{glsl.floatLit b})"
      else 
        "mod(#{glsl.literal a},#{glsl.literal b})"

    div: (a, b) ->
      if typeof a == 'number' and typeof b == 'number'
        a / b
      else if typeof a == 'number'
        switch a
          when 0 then 0
          else 
            # Number must not be integers (bitwise op converts operand to integer)
            "#{glsl.floatLit a} / #{glsl.literal b}"
      else if typeof b == 'number'
        switch b
          when 0 then "#{glsl.literal a} / 0.0" # infinity
          else 
            # Number must not be integers (bitwise op converts operand to integer)
            "#{glsl.literal a} / #{glsl.floatLit b}"
      else if (Array.isArray a) and (Array.isArray b)
        if a.length != b.length
          throw "Cannot perform divide operation with array operands of different lengths."
        if (isArrayType a, 'number') and (isArrayType b, 'number')
          (a[i] / b[i]) for i in [0...a.length]
        else
          "#{glsl.vecLit a} / #{glsl.vecLit b}"
      else
        "#{glsl.literal a} / #{glsl.literal b}"

    add: (a, b) ->
      if typeof a == 'number' and typeof b == 'number'
        a + b
      else if typeof a == 'number'
        switch a
          when 0 then b
          else 
            # Number must not be integers (bitwise op converts operand to integer)
            "#{glsl.floatLit a} + #{glsl.literal b}"
      else if typeof b == 'number'
        glsl.add b, a
      else if (Array.isArray a) and (Array.isArray b)
        if a.length != b.length
          throw "Cannot perform add operation with array operands of different lengths."
        if (isArrayType a, 'number') and (isArrayType b, 'number')
          (a[i] + b[i]) for i in [0...a.length]
        else
          "#{glsl.vecLit a} + #{glsl.vecLit b}"
      else 
        "#{glsl.literal a} + #{glsl.literal b}"

    sub: (a, b) ->
      if typeof a == 'number' and typeof b == 'number'
        a - b
      else if typeof a == 'number'
        switch a
          when 0 then glsl.neg b
          else 
            # Number must not be integers (bitwise op converts operand to integer)
            "#{glsl.floatLit a} - #{glsl.literal b}"
      else if typeof b == 'number'
        switch b
          when 0 then a
          else 
            # Number must not be integers (bitwise op converts operand to integer)
            "#{glsl.literal a} - #{glsl.floatLit b}"
      else if (Array.isArray a) and (Array.isArray b)
        if a.length != b.length
          throw "Cannot perform subtract operation with array operands of different lengths."
        if (isArrayType a, 'number') and (isArrayType b, 'number')
          (a[i] - b[i]) for i in [0...a.length]
        else
          "#{glsl.vecLit a} - #{glsl.vecLit b}"
      else 
        "#{glsl.literal a} - #{glsl.literal b}"

    neg: (a) ->
      if typeof a == 'number'
        -a 
      else if (Array.isArray a) and (isArrayType a, 'number')
        -ai for ai in a
      else
        "-#{glsl.literal a}"

    min: (a,b) ->
      if typeof a == typeof b == 'number'
        Math.min a, b
      else if typeof a == typeof b == 'string'
        "min(#{a}, #{b})"
      else if typeof a == 'string'
        "min(#{a}, #{glsl.literal b})"
      else if typeof b == 'string'
        "min(#{glsl.literal a}, #{b})"
      else if (Array.isArray a) and (Array.isArray b)
        if a.length != b.length
          throw "Cannot perform min operation with array operands of different lengths."
        if (isArrayType a, 'number') and (isArrayType b, 'number')
          (Math.min a[i], b[i]) for i in [0...a.length]
        else 
          "min(#{glsl.vec3Lit a}, #{glsl.vec3Lit b})"
      else
        throw "Operands passed to the min operation have incorrect types."
      
    max: (a,b) ->
      if typeof a == typeof b == 'number'
        Math.max a, b
      else if typeof a == typeof b == 'string'
        "max(#{a}, #{b})"
      else if typeof a == 'string'
        "max(#{a}, #{glsl.literal b})"
      else if typeof b == 'string'
        "max(#{glsl.literal a}, #{b})"
      else if (Array.isArray a) and (Array.isArray b)
        if a.length != b.length
          throw "Cannot perform operation with arrays of different lengths."
        if (isArrayType a, 'number') and (isArrayType b, 'number')
          (Math.max a[i], b[i]) for i in [0...a.length]
        else 
          "max(#{glsl.vec3Lit a}, #{glsl.vec3Lit b})"
      else
        throw "Operands passed to the max operation have incorrect types."

    clamp: (a,min,max) ->
      # TODO: (Optimization) if only min or max is a string we can transform this into a glsl min / max operation...
      # TODO: also check for `min` and/or `max` that are scalar arguments with a vector `a` argument
      if typeof a == typeof min == typeof max == 'number'
        Math.clamp a, min, max
      else if typeof a == typeof min == typeof max == 'string'
        "clamp(#{a}, #{min}, #{max})"
      else if (Array.isArray a) and (Array.isArray min) and (Array.isArray max)
        if a.length != b.length
          throw "Cannot perform clamp operation with array operands of different lengths."
        if (isArrayType a, 'number') and (isArrayType min, 'number') and (isArrayType max, 'number')
          (Math.clamp a[i], min[i], max[i]) for i in [0...a.length]
        else 
          "clamp(#{glsl.vec3Lit a}, #{glsl.vec3Lit min}, #{glsl.vec3Lit max})"
      else
        "clamp(#{if typeof a == 'string' then a else glsl.literal a}, #{if typeof min == 'string' then min else glsl.literal min}, #{if typeof max == 'string' then max else glsl.literal max})"

    mini: (a,b) ->
      if typeof a == typeof b == 'number'
        Math.min a, b
      else if typeof a == typeof b == 'string'
        "min(#{a}, #{b})"
      else if typeof a == 'string' or typeof b == 'string'
        "max(#{a}, #{b})"
      else if (Array.isArray a) and (Array.isArray b)
        if a.length != b.length
          throw "Cannot perform operation with arrays of different lengths."
        if (isArrayType a, 'number') and (isArrayType b, 'number')
          (Math.max a[i], b[i]) for i in [0...a.length]
        else 
          "max(vec3(#{a}), vec3(#{b}))"
      else
        throw "Operands passed to the max operation have incorrect types."

    maxi: (a,b) ->
      if typeof a == typeof b == 'number'
        Math.max a, b
      else if typeof a == typeof b == 'string'
        "max(#{a}, #{b})"
      else if typeof a == 'string' or typeof b == 'string'
        "max(#{a}, #{b})"
      else if (Array.isArray a) and (Array.isArray b)
        if a.length != b.length
          throw "Cannot perform operation with arrays of different lengths."
        if (isArrayType a, 'number') and (isArrayType b, 'number')
          (Math.max a[i], b[i]) for i in [0...a.length]
        else 
          "max(vec3(#{a}), vec3(#{b}))"
      else
        throw "Operands passed to the max operation have incorrect types."

    literal: (a) ->
      if typeof a == 'number'
        glsl.floatLit a
      else if (Array.isArray a)
        glsl.vecLit a
      else
        "(#{a})"
      
    floatLit: (a) ->
      if typeof a == 'number' and (a | 0) == a 
        a + '.0'
      else
        "(#{a})"
    
    vecLit: (a) ->
      if a.length > 1 and a.length < 5
        glsl["vec#{a.length}Lit"] a
      else
        throw "Cannot create vector literal with length #{a.length}."

    vec2Lit: (a) ->
      if typeof a == 'number'
        "vec2(#{glsl.floatLit a})"
      else if (Array.isArray a)
        "vec2(#{glsl.floatLit a[0]},#{glsl.floatLit a[1]})"
      else
        "(#{a})"

    vec3Lit: (a) ->
      if typeof a == 'number'
        "vec3(#{glsl.floatLit a})"
      else if (Array.isArray a)
        "vec3(#{glsl.floatLit a[0]},#{glsl.floatLit a[1]},#{glsl.floatLit a[2]})"
      else
        "(#{a})"

    vec4Lit: (a) ->
      if typeof a == 'number'
        "vec4(#{glsl.floatLit a})"
      else if (Array.isArray a)
        "vec4(#{glsl.floatLit a[0]},#{glsl.floatLit a[1]},#{glsl.floatLit a[2]},#{glsl.floatLit a[3]})"
      else
        "(#{a})"

    axisRotation: (axis, angle) ->
      if (isArrayType axis, 'number') and (typeof angle == 'number')
        return gl.matrix3.newAxisRotation axis, angle

      mecha.logInternalError "axisRotation is not yet implemented in the GLSL API."
      ###
      # TODO: This can (should) probably be optimized a lot...
      # Convert rotation to quaternion representation
      length = glsl.length axis
      halfAngle = glsl.mul angle, 0.5
      sinHalfOverLength = glsl.div (glsl.sin halfAngle), length
      xyz = glsl.mul axis, sinHalfOverLength
      x = glsl.index xyz, 0
      y = glsl.index xyz, 1
      z = glsl.index xyz, 2
      w = glsl.cos halfAngle
      # Convert quaternion to matrix representation       
      xx = glsl.mul x, x
      xy = glsl.mul x, y
      xz = glsl.mul x, z
      xw = glsl.mul x, w
      yy = glsl.mul y, y
      yz = glsl.mul y, z
      yw = glsl.mul y, w
      zz = glsl.mul z, z
      zw = glsl.mul z, w
      return [
        (glsl.sub 1, (glsl.mul 2, (glsl.add yy, zz))), (glsl.mul 2, (glsl.add xy, zw)),               (glsl.mul 2, (glsl.sub xz, yw)),
        (glsl.mul 2, (glsl.sub xy, zw)),               (glsl.sub 1, (glsl.mul 2, (glsl.add xx, zz))), (glsl.mul 2, (glsl.add yz, xw)),
        (glsl.mul 2, (glsl.add xz, yw)),               (glsl.mul 2, (glsl.sub yz, xw)),               (glsl.sub 1, (glsl.mul 2, (glsl.mul xx, yy)))
      ]
      ###
      

