# Generic routines for manipulating / traversing the ASM hierarchy

mapASM = (preDispatch, postDispatch, stack, node, flags) ->
  stack.reverse()
  resultNode = { type: node.type, attr: node.attr, nodes: [] }
  if preDispatch[node.type]? 
    preDispatch[node.type] stack, resultNode, flags
  else
    preDispatch['default'] stack, resultNode, flags
  stack.reverse()
  
  stack.push resultNode

  mapASM preDispatch, postDispatch, stack, n, flags for n in (node.nodes or [])

  stack.pop()
  
  stack.reverse()
  if postDispatch[node.type]? 
    postDispatch[node.type] stack, resultNode, flags
  else
    postDispatch['default'] stack, resultNode, flags
  stack.reverse()
  return stack[0]
