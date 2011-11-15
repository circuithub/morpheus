# Static analysis routines for collecting information about abstract solid model nodes

mapCollectASM = (nodes, flags, params, dispatch) ->
  for node in nodes
    switch node.type
      when 'invert'
        flags.invert = not flags.invert
        if dispatch[node.type]?
          dispatch[node.type] node, flags, params
        mapCollectASM node.nodes, flags, params, dispatch
        flags.invert = not flags.invert
      when 'translate'
        parentTranslation = flags.translation
        flags.translation = node.attr.offset
        mapCollectASM node.nodes, flags, params, dispatch	
        flags.translation = parentTranslation
      else
        if dispatch[node.type]?
          dispatch[node.type] node, flags, params
        else
          dispatch.default node, flags, params if dispatch.default != null

collectASM =
  intersect: (nodes, flags, halfSpaceBins) ->
    mapCollectASM nodes, flags, {halfSpaceBins: halfSpaceBins},
      halfspace: (node, flags, params) -> 
        params.halfSpaceBins[node.attr.axis + (if flags.invert then 3 else 0)].push node.attr.val
      mirror: () -> # ignore
      default: (node) ->
        mecha.logInternalError "ASM Collect: Unsupported node type, '#{node.type}', inside intersection."
