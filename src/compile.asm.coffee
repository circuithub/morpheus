# Compile the concrete solid model into a abstract solid model
compileASM = (concreteSolidModel) ->
  asm =
    union: (nodes...) -> 
      type: 'union'
      nodes: nodes.flatten()
    intersect: (attr, nodes...) -> 
      type: 'intersect'
      attr: attr
      nodes: nodes.flatten()
    invert: (nodes...) ->
      type: 'invert'
      nodes: nodes.flatten()
    halfplane: (attr, nodes...) ->
      type: 'halfplane'
      attr: attr
  
  compileASMNode = (node) ->
    switch typeof node
      when 'object'
        switch node.type
          when 'scene'
            if node.nodes.length > 1
              asm.union (compileASMNode n for n in node.nodes)...
            else if node.nodes.length == 1
              compileASMNode node.nodes[0]
            else 
              {}
          when 'box'
            asm.intersect (
              { symmetric: false }
              asm.halfplane 
                val: -node.attr.dimensions[0]
                axis: 0
              asm.halfplane
                val: -node.attr.dimensions[1]
                axis: 1
              asm.halfplane
                val: -node.attr.dimensions[2]
                axis: 2
              asm.invert (
                asm.halfplane 
                  val: node.attr.dimensions[0]
                  axis: 0
                asm.halfplane 
                  val: node.attr.dimensions[1]
                  axis: 1
                asm.halfplane 
                  val: node.attr.dimensions[2]
                  axis: 2
              )
            )
          when 'sphere'
            {} # TODO
          when 'cylinder'
            {} # TODO

  if concreteSolidModel.type != 'scene'
    mecha.log "Expected node of type 'scene' at the root of the solid model"
    return
  
  compileASMNode concreteSolidModel
  
