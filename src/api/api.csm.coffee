# Application Programmer Interface for building solid models

# The result of any API operation is a Concrete Solid Model (CSM) passed along to a compiler (or to another API operation)
# Every API function is a variadic function that takes some attributes as its first argument and (optionally) a tail list of nodes to compose

do () ->
  # Internal utilities
  extend = (obj, mixin) ->
    for name, method of mixin
      obj[name] = method
    return obj

  mechaTypeof = (value) -> 
    if Array.isArray value
      if value.length <= 4 then "vec#{value.length}" else 'unknown'
    else
      # TODO: Support int for loops
      'float'

  mechaPrimitiveTypeof = (value) -> 
    if Array.isArray value and value.length > 0
      mechaPrimitiveTypeof value[0]
    else
      switch typeof value
        when 'number' then 'float'
        else 'unknown'

  # Fluid API builder
  Dispatcher = ->
  dispatch = new Dispatcher
  
  Api = (f) ->
    return () -> 
      obj = extend (Object.create dispatch), (f arguments...)
      obj.nodes.unshift this if this? and this instanceof Dispatcher
      return obj

  # API dispatcher
  extend dispatch,
    union: Api (nodes...) ->
      type: 'union'
      nodes: nodes
    intersect: Api (nodes...) ->
      type: 'intersect'
      nodes: nodes
    difference: Api (nodes...) ->
      type: 'difference'
      nodes: nodes
    box: Api (attr, nodes...) ->
      # Apply defaults
      #if attr.chamfer?
      #  # Chamfer corners is on by default
      #  if not attr.chamfer.corners?
      #    attr.chamfer.corners = true
      #  # Chamfer all edges by default
      #  node.chamfer.edges = [0..11]
      type: 'box'
      attr: attr
      nodes: nodes
    cylinder: Api (attr, nodes...) ->
      type: 'cylinder'
      attr: attr
      nodes: nodes
    sphere: Api (attr, nodes...) ->
      type: 'sphere'
      attr: attr
      nodes: nodes
    mirror: Api (attr, nodes...) ->
      type: 'mirror'
      attr: attr
      nodes: nodes
    translate: Api (attr, nodes...) ->
      type: 'translate'
      attr: attr
      nodes: nodes
    rotate: Api (attr, nodes...) ->
      type: 'rotate'
      attr: attr
      nodes: nodes
    scale: Api (attr, nodes...) ->
      type: 'scale'
      attr: attr
      nodes: nodes
    material: Api (attr, nodes...) ->
      type: 'material'
      attr: attr
      nodes: nodes
    chamfer: Api (attr, nodes...) ->
      type: 'chamfer'
      attr: attr
      nodes: nodes
    bevel: Api (attr, nodes...) ->
      type: 'bevel'
      attr: attr
      nodes: nodes
    wedge: Api (attr, nodes...) ->
      type: 'wedge'
      attr: attr
      nodes: nodes

  # Put API functions into the global namespace
  window.scene = (attr, nodes...) ->
    serializeAttr = (attr) ->
      if attr instanceof MechaExpression
        return attr.serialize()
      else if Array.isArray attr
        for i in [0...attr.length]
          attr[i] = serializeAttr attr[i]
      else if typeof attr == 'object'
        for key, val of attr
          attr[key] = serializeAttr val
      return attr
    serializeNodes = (nodes) ->
      { type: n.type, attr: (serializeAttr n.attr), nodes: serializeNodes n.nodes } for n in nodes
    type: 'scene'
    attr: attr
    nodes: serializeNodes nodes

  extend window, dispatch

  # Parameters
  globalParamIndex = 0
  
  class MechaParameter
    constructor: (attr) ->
      @attr = attr
      @str = "u#{attr.paramIndex}"
      exportedParameters[this.str] = attr

  class MechaExpression
    constructor: (param, str) ->
      @param = param
      @str = if str? then str else new String param.str
    serialize: ->
      @str
    update: (str) ->
      new MechaExpression @param, str
    index: (arg) ->
      if typeof arg == 'number' and (arg | 0) == arg # (bitwise op converts operand to integer)
        @update "#{@str}[#{arg}]"
      else
        throw "Argument to index must be an integer"
    mul: (arg) ->
      if @attr.primitiveType == 'float' and typeof arg == 'number' and (arg | 0) == arg # (bitwise op converts operand to integer)
        @update "(#{@str}) * #{arg}.0"
      else
        @update "(#{@str}) * #{arg}"
    div: (arg) ->
      if @attr.primitiveType == 'float' and typeof arg == 'number' and (arg | 0) == arg # (bitwise op converts operand to integer)
        @update "(#{@str}) / #{arg}.0"
      else
        @update "(#{@str}) / #{arg}"
    add: (arg) ->
      if @attr.primitiveType == 'float' and typeof arg == 'number' and (arg | 0) == arg # (bitwise op converts operand to integer)
        @update "(#{@str}) + #{arg}.0"
      else
        @update "(#{@str}) + #{arg}"
    sub: (arg) ->
      if @attr.primitiveType == 'float' and typeof arg == 'number' and (arg | 0) == arg # (bitwise op converts operand to integer)
        @update "(#{@str}) - #{arg}.0"
      else
        @update "(#{@str}) - #{arg}"
  
  window.range = (description, defaultArg, start, end, step) ->
    paramIndex = globalParamIndex
    ++globalParamIndex
    new MechaExpression (new MechaParameter
      param: 'range'
      description: description
      type: mechaTypeof defaultArg
      primitiveType: mechaPrimitiveTypeof defaultArg
      paramIndex: paramIndex
      start: start
      end: end
      step: step
      defaultArg: defaultArg
    )

  window.number = (description, defaultArg) ->
    paramIndex = globalParamIndex
    ++globalParamIndex
    new MechaExpression (new MechaParameter
      param: 'param'
      description: description
      type: mechaTypeof defaultArg
      primitiveType: mechaPrimitiveTypeof defaultArg
      defaultArg: defaultArg
    )

