# The GLSL builder API (This builder produces strings rather than a tree)

glsl = do ->
  isArrayType = (a, typeString) ->
    for element in a
      if typeof element != typeString
        return false
    return true

  api =
    subscript: (a, index) ->
      if Array.isArray a
        return a[index]
      else
        "#{a}[#{index}]"
    
    mul: (a, b) ->
      if typeof a == 'number' and typeof b == 'number'
        a * b
      else if typeof a == 'number'
        switch a
          when 0 then 0
          when 1 then b
          when -1 then "-#{b}"
          else 
            # Number must not be integers (bitwise op converts operand to integer)
            "#{if (a | 0) == a then (a + '.0') else a} * #{b}"
      else if typeof b == 'number'
        switch b
          when 0 then 0
          when 1 then a
          when -1 then "-#{a}"
          else 
            # Number must not be integers (bitwise op converts operand to integer)
            "#{a} * #{if (b | 0) == b then (b + '.0') else b}"
      else 
        "#{a} * #{b}"
      # TODO: handle vectors
      # else if Array.isArray a
      # else if Array.isArray b
      # TODO: handle uniforms
      # else if typeof a == 'object'
      # else if typeof b == 'object'

    mod: (a, b) ->
      if typeof a == 'number' and typeof b == 'number'
        a % b
      else if Array.isArray a and Array.isArray b
        if a.length != b.length
          throw "Cannot perform mod operation with array operands of different lengths"
        if (isArrayType a, 'number') and (isArrayType b, 'number')
          (a[i] % b[i]) for i in [0...a.length]
        else
          "mod(#{glsl.vecLit a},#{glsl.vecLit b})"
      else if typeof a == 'number'
        switch a
          when 0 then 0
          else 
            # Number must not be integers (bitwise op converts operand to integer)
            "mod(#{glsl.floatLit a},#{b})"
      else if typeof b == 'number'
        switch b
          when 0 then NaN
          else 
            # Number must not be integers (bitwise op converts operand to integer)
            "mod(#{a},#{glsl.floatLit b})"
      else 
        "mod(#{a},#{b})"

    div: (a, b) ->
      if typeof a == 'number' and typeof b == 'number'
        a / b
      else if typeof a == 'number'
        switch a
          when 0 then 0
          else 
            # Number must not be integers (bitwise op converts operand to integer)
            "#{if (a | 0) == a then (a + '.0') else a} / #{b}"
      else if typeof b == 'number'
        switch b
          when 0 then "#{a} / 0.0" # infinity
          else 
            # Number must not be integers (bitwise op converts operand to integer)
            "#{a} / #{if (b | 0) == b then (b + '.0') else b}"
      else 
        "#{a} / #{b}"
      # TODO: handle vectors
      # else if Array.isArray a
      # else if Array.isArray b
      # TODO: handle uniforms
      # else if typeof a == 'object'
      # else if typeof b == 'object'

    add: (a, b) ->
      if typeof a == 'number' and typeof b == 'number'
        a + b
      else if typeof a == 'number'
        switch a
          when 0 then b
          else 
            # Number must not be integers (bitwise op converts operand to integer)
            "#{if (a | 0) == a then (a + '.0') else a} + #{b}"
      else if typeof b == 'number'
        glsl.add b, a
      else 
        "#{a} + #{b}"
      # TODO: handle vectors
      # else if Array.isArray a
      # else if Array.isArray b
      # TODO: handle uniforms
      # else if typeof a == 'object'
      # else if typeof b == 'object'

    sub: (a, b) ->
      if typeof a == 'number' and typeof b == 'number'
        a - b
      else if typeof a == 'number'
        switch a
          when 0 then glsl.neg b
          else 
            # Number must not be integers (bitwise op converts operand to integer)
            "#{if (a | 0) == a then (a + '.0') else a} - #{b}"
      else if typeof b == 'number'
        switch b
          when 0 then a
          else 
            # Number must not be integers (bitwise op converts operand to integer)
            "#{a} - #{if (b | 0) == b then (b + '.0') else b}"
      else 
        "#{a} - #{b}"
      # TODO: handle vectors
      # else if Array.isArray a
      # else if Array.isArray b
      # TODO: handle uniforms
      # else if typeof a == 'object'
      # else if typeof b == 'object'

    neg: (a) ->
      if typeof a == 'number'
        -a 
      else
        "-#{a}"
      # TODO: handle vectors
      # else if Array.isArray a
      # TODO: handle uniforms
      # else if typeof a == 'object'

    min: (a,b) ->
      if typeof a == typeof b == 'number'
        Math.min a, b
      else if typeof a == typeof b == 'string'
        "min(#{a}, #{b})"
      else if typeof a == 'string'
        "min(#{a}, #{glsl.literal b})"
      else if typeof b == 'string'
        "min(#{glsl.literal a}, #{b})"
      else if Array.isArray a and Array.isArray b
        if a.length != b.length
          throw "Cannot perform min operation with array operands of different lengths"
        numbersOnly = true
        for i in [0...a.length]
          if typeof a[i] != 'number' or typeof b[i] != 'number'
            numbersOnly = false
            break
        if numbersOnly
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
      else if Array.isArray a and Array.isArray b
        if a.length != b.length
          throw "Cannot perform operation with arrays of different lengths"
        numbersOnly = true
        for i in [0...a.length]
          if typeof a[i] != 'number' or typeof b[i] != 'number'
            numbersOnly = false
            break
        if numbersOnly
          (Math.max a[i], b[i]) for i in [0...a.length]
        else 
          "max(#{glsl.vec3Lit a}, #{glsl.vec3Lit b})"
      else
        throw "Operands passed to the max operation have incorrect types."

    mini: (a,b) ->
      if typeof a == typeof b == 'number'
        Math.min a, b
      else if typeof a == typeof b == 'string'
        "min(#{a}, #{b})"
      else if typeof a == 'string' or typeof b == 'string'
        "max(#{a}, #{b})"
      else if Array.isArray a and Array.isArray b
        if a.length != b.length
          throw "Cannot perform operation with arrays of different lengths"
        numbersOnly = true
        for i in [0...a.length]
          if typeof a[i] != 'number' or typeof b[i] != 'number'
            numbersOnly = false
            break
        if numbersOnly
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
      else if Array.isArray a and Array.isArray b
        if a.length != b.length
          throw "Cannot perform operation with arrays of different lengths"
        numbersOnly = true
        for i in [0...a.length]
          if typeof a[i] != 'number' or typeof b[i] != 'number'
            numbersOnly = false
            break
        if numbersOnly
          (Math.max a[i], b[i]) for i in [0...a.length]
        else 
          "max(vec3(#{a}), vec3(#{b}))"
      else
        throw "Operands passed to the max operation have incorrect types."

    literal: (a) ->
      if typeof a == 'string'
        a
      else if typeof a == 'number'
        glsl.floatLit a
      else if Array.isArray a
        glsl.vecLit a
      
    floatLit: (a) ->
      if typeof a == 'string'
        a
      else
        if (a | 0) == a then a + '.0' else a
    
    vecLit: (a) ->
      if a.length > 1 and a.length < 5
        glsl["vec#{a.length}Lit"] a
      else
        throw "Cannot create vector literal with length #{a.length}."

    vec2Lit: (a) ->
      if typeof a == 'string'
        a
      else if typeof a == 'number'
        "vec2(#{glsl.floatLit a})"
      else
        "vec2(#{glsl.floatLit a[0]},#{glsl.floatLit a[1]})"

    vec3Lit: (a) ->
      if typeof a == 'string'
        a
      else if typeof a == 'number'
        "vec3(#{glsl.floatLit a})"
      else
        "vec3(#{glsl.floatLit a[0]},#{glsl.floatLit a[1]},#{glsl.floatLit a[2]})"

    vec4Lit: (a) ->
      if typeof a == 'string'
        a
      else if typeof a == 'number'
        "vec4(#{glsl.floatLit a})"
      else
        "vec4(#{glsl.floatLit a[0]},#{glsl.floatLit a[1]},#{glsl.floatLit a[2]},#{glsl.floatLit a[3]})"

