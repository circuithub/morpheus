# Static analysis / optimization routines for reducing the abstract solid model

optimizeASM = (node, flags) ->
  resultNode = {}
  if not flags?
    flags = 
      invert: false
      #translation: [0.0,0.0,0.0]

  # Update flags before processing sub-nodes
  preDispatch = 
    invert: (stack, node, flags) ->
      flags.invert = not flags.invert
    default: (stack, node, flags) ->
      return
  
  # Optimization which flattens duplicate nested nodes
  postDispatch =
    invert: (stack, node, flags) ->
      flags.invert = not flags.invert
      # TODO: if this node contains only half-spaces, then search for symmetry (try to convert this node into a mirror node)
      stack[0].nodes.push node
    union: (stack, node, flags) ->
      for s in stack
        switch s.type
          when 'union'
            # The node at the top of the stack is either intersect or non-union (like mirror, invert or translate for example)
            stack[0].nodes = stack[0].nodes.concat node.nodes
            return # Discard node
          when 'intersect'
            break
          else
            continue # Search for preceding union node
        break # Any other type of node means the union node is needed
      stack[0].nodes.push node
    intersect: (stack, node, flags) ->
      for s in stack
        switch s.type
          when 'union'
            break
          when 'intersect'
            # The node at the top of the stack is either intersect or non-union (like mirror, invert or translate for example)
            stack[0].nodes = stack[0].nodes.concat node.nodes
            return # Discard node
          else
            continue # Search for preceding intersect node
        break # Any other type of node means the intersect node is needed
      stack[0].nodes.push node
    translate: (stack, node, flags) ->
      # TODO
      #for s in stack
      #  switch s.type
      #    when 'translate'
      #      s.nodes = s.nodes.concat node.nodes
      #      return # Discard node
      #  break # Only run to depth of one
      stack[0].nodes.push node
    halfspace: (stack, node, flags) ->
      if node.nodes.length > 0
        mecha.logInternalError "ASM Optimize: Unexpected child nodes found in halfspace node."
      for s in stack
        switch s.type
          when 'intersect'
            for n in s.nodes
              if n.type == 'halfspace' and n.attr.axis == node.attr.axis
                if (n.attr.val < node.attr.val and flags.invert) or (n.attr.val > node.attr.val and not flags.invert)
                  n.attr = node.attr
                return # Discard node
        break # Only run to depth of one
      stack[0].nodes.push node
    default: (stack, node, flags) ->
      stack[0].nodes.push node

  return mapASM preDispatch, postDispatch, [{type: 'union', nodes: []}], node, flags

