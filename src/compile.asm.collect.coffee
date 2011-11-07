# Static analysis routines for collecting information about abstract solid model nodes

mapASM = (nodes, flags, params, dispatch) ->
  for node in nodes
    switch node.type
      when 'invert'
        flags.invert = not flags.invert
        if dispatch[node.type]?
          dispatch[node.type] node, flags, params
        mapASM node.nodes, flags, params, dispatch
        flags.invert = not flags.invert
      else
        if dispatch[node.type]?
          dispatch[node.type] node, flags, params
        else
          dispatch.default node, flags, params if dispatch.default != null

collectASM =
  #intersect: (nodes, flags, halfSpaceBins) ->
  #  for node in nodes
  #    switch node.type
  #      when 'halfspace' 
  #        halfSpaceBins[node.attr.axis + (if flags.invert then 3 else 0)].push node.attr.val
  #      when 'intersect' 
  #        mecha.logInternalError "ASM Collect: Intersect nodes should not be directly nested expected intersect nodes to be flattened ASM compiler."
  #      when 'invert'
  #        flags.invert = not flags.invert
  #        collectASM.intersect node.nodes, flags, halfSpaceBins
  #        flags.invert = not flags.invert
  #      else
  #        mecha.logInternalError "ASM Collect: Unsuppported node type, '#{node.type}', inside intersection."
  
  intersect: (nodes, flags, halfSpaceBins) ->
    mapASM nodes, flags, {halfSpaceBins: halfSpaceBins},
      halfspace: (node, flags, params) -> 
        params.halfSpaceBins[node.attr.axis + (if flags.invert then 3 else 0)].push node.attr.val
      default: (node) ->
        mecha.logInternalError "ASM Collect: Unsuppported node type, '#{node.type}', inside intersection."
