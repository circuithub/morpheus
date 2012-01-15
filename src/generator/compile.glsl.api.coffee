# The GLSL builder API (This builder produces strings rather than a tree)

glsl =
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
