# Translate the CSM source code into a valid javascript program
translateCSM = (apiSourceCode, csmSourceCode) ->
  # Extract all parameters from the source
  # (Note: if desired this could be optimized quite a bit)
  variablesSource = csmSourceCode.match /var[^;]*;/g
  csmSourceCode = (csmSourceCode.replace /var[^;]*;/g, '').trim()

  # Concatenate the sandbox source code
  jsSourceCode =
    """
    "use strict";
    (function(){
      /* BEGIN API *\/
      
      var exportedParameters = [];

    #{apiSourceCode}
    
      try {

      /* BEGIN PARAMETERS *\/

    #{if variablesSource then variablesSource.join '\n' else ""}

      /* BEGIN SOURCE *\/
      return scene({ params: exportedParameters }#{if csmSourceCode.trim().length > 0 then ',' else ''}
    
    #{csmSourceCode}
    
      );//*\/
      } catch(err) {
        return String(err);
      }
    })();
    """

  return jsSourceCode

translateCSMWithArguments = (apiSourceCode, csmSourceCode, args) ->
  # Extract all parameters from the source
  # (Note: if desired this could be optimized quite a bit)
  csmSourceCode = (csmSourceCode.replace /var[^;]*;/g, '').trim()

  variablesSource = []
  for key,val of args 
    valCode = 
      if Array.isArray val
        "[#{val}]"
      else if typeof val == "string"
        # Escape internal escapes and quotation characters
        valCopy = "#{val}"
        valCopy.replace /(\\|")/g, (match) -> "\\#{match}"
        "\"#{valCopy}\""
      else # if typeof val == "number"
        val
    variablesSource.push "var #{key} = #{valCode};"
  
  # Concatenate the sandbox source code
  jsSourceCode =
    """
    "use strict";
    (function(){
      /* BEGIN API *\/
      
      var exportedParameters = [];

    #{apiSourceCode}
    
      try {

      /* BEGIN PARAMETERS *\/

    #{if variablesSource then variablesSource.join '\n' else ""}

      /* BEGIN SOURCE *\/
      return scene({ params: exportedParameters }#{if csmSourceCode.trim().length > 0 then ',' else ''}
    
    #{csmSourceCode}
    
      );//*\/
      } catch(err) {
        return String(err);
      }
    })();
    """

  return jsSourceCode

