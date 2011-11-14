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
  intersect: (nodes, flags, halfSpaceBins) ->
    mapASM nodes, flags, {halfSpaceBins: halfSpaceBins},
      halfspace: (node, flags, params) -> 
        params.halfSpaceBins[node.attr.axis + (if flags.invert then 3 else 0)].push node.attr.val
      mirror: () -> # ignore
      default: (node) ->
        mecha.logInternalError "ASM Collect: Unsuppported node type, '#{node.type}', inside intersection."
