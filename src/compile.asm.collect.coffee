# Static analysis routines for collecting information about abstract solid model nodes

collectASM =
  intersect: (nodes, flags, halfSpaceBins) ->
    for node in nodes
      switch node.type
        when 'halfspace' 
          halfSpaceBins[node.attr.axis + (if flags.invert then 3 else 0)].push node.attr.val
        when 'intersect' 
          mecha.logInternalError "ASM Collect: Intersect nodes should not be directly nested expected intersect nodes to be flattened ASM compiler."
        when 'invert'
          flags.invert = not flags.invert
          collectASM.intersect node.nodes, flags, halfSpaceBins
          flags.invert = not flags.invert
        else
          mecha.logInternalError "ASM Collect: Unsuppported node type, '#{node.type}', inside intersection."


#mapASM = (nodes, flags, halfSpaceBins) ->

