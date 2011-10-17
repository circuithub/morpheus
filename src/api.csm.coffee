# Application Programmer Interface for building solid models

# The result of any API operation is a Concrete Solid Model (CSM) passed along to a compiler (or to another API operation)
# Every API function is a variadic function that takes some attributes as its first argument and (optionally) a tail list of nodes to compose

box = (attr, nodes...) ->
  console.log attr
  for node in nodes
    console.log node

cylinder = (attr, nodes...) ->
  console.log attr
  for node in nodes
    console.log node

sphere = (attr, nodes...) ->
  console.log attr
  for node in nodes
    console.log node

