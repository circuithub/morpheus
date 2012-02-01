# Translate the CSM source code into a valid javascript program
translateCSM = safeExport 'mecha.generator.translateCSM', '', (apiSourceCode, csmSourceCode) ->
  # Extract all parameters from the source
  # (Note: if desired this could be optimized quite a bit)
  variablesSource = csmSourceCode.match /var[^;]*;/g
  csmSourceCode = (csmSourceCode.replace /var[^;]*;/g, '').trim()

  # TODO: variables source code is no longer needed
  #if variablesSource?
  #  variables = flatten (v.split 'var' for v in variablesSource)
  #  variables = flatten (v.split ',' for v in variables)
  #  variables = ((v.split '=')[0] for v in variables when (v.search '=') != -1)
  #  variables = (v.trim() for v in variables when (v.search /\(\)\=\,/) == -1)
  #else
  #  variables = []

  # Concatenate the sandbox source code
  jsSourceCode =
    """
    "use strict";
    (function(){
      /* BEGIN API */
      
      var exportedParameters = [];

    #{apiSourceCode}
    
      try {

      /* BEGIN PARAMETERS */

    #{if variablesSource then variablesSource.join '\n' else ""}

      /* BEGIN SOURCE */ //HERE
      return scene({ params: exportedParameters }#{if csmSourceCode.trim().length > 0 then ',' else ''}
    
    #{csmSourceCode}
    
      );//*/
      } catch(err) {
        return String(err);
      }
    })();
    """

  return jsSourceCode

