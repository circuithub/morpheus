# Application Programmer Interface for building solid models

# The result of any API operation is a Concrete Solid Model (CSM) passed along to a compiler (or to another API operation)
# Every API function is a variadic function that takes some attributes as its first argument and (optionally) a tail list of nodes to compose

# TODO: Need to encapsulate/hide the CSM solid model so that it cannot be modified outside the API.
# _csmModel = {};

do () ->
  _csmModel = {}

  return {
    union: (attr, nodes...) ->
      type: 'union'
      attr: attr
      nodes: nodes

    intersect: (attr, nodes...) ->
      type: 'intersect'
      attr: attr
      nodes: nodes

    difference: (attr, nodes...) ->
      type: 'difference'
      attr: attr
      nodes: nodes

    box: (attr, nodes...) ->
      type: 'box'
      attr: attr
      nodes: nodes

    cylinder: (attr, nodes...) ->
      type: 'cylinder'
      attr: attr
      nodes: nodes

    sphere: (attr, nodes...) ->
      type: 'sphere'
      attr: attr
      nodes: nodes

    getModel: () ->
      clone = () ->
        if obj == null || typeof obj != 'object'
          return obj
        temp = new obj.constructor()
        for key in obj
          temp[key] = clone obj[key]
        return temp
      clone _csmModel
  }    

