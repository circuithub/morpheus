# A prototype object for object that can be type coerced to strings

class toStringPrototype
  constructor: (str) -> @str = str
  toString: () -> @str

