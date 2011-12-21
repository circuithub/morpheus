# Compile the source code into a concrete solid model
compileCSM = (csmSourceCode, callback) ->
  #TODO: Do we need to supply our own try-catch block? For now we're just relying on JSandbox's error catching code...

  
  # Extract all parameters from the source
  # (Note: if desired this could be optimized quite a bit)
  variablesSource = csmSourceCode.match /var[^;]*;/g
  csmSourceCode = (csmSourceCode.replace /var[^;]*;/g, '').trim()

  # TODO: variables source code is no longer needed
  #if variablesSource?
  #  variables = (v.split 'var' for v in variablesSource).flatten()
  #  variables = (v.split ',' for v in variables).flatten()
  #  variables = ((v.split '=')[0] for v in variables when (v.search '=') != -1)
  #  variables = (v.trim() for v in variables when (v.search /\(\)\=\,/) == -1)
  #else
  #  variables = []

  # Concatenate the sandbox source code
  sandboxSourceCode =
    '''
    "use strict";
    (function(){
      /* BEGIN API */
      
      var exportedParameters = [];

    ''' + "\n#{state.api.sourceCode}\n" +
    '''

      try {

    ''' + (if variablesSource then "\n#{variablesSource.join '\n'}\n" else "") +
    '''
      /* BEGIN SOURCE */
      return scene({ params: exportedParameters },
    ''' + csmSourceCode +
    '''
      );
      } catch(err) {
        return String(err);
      }
    })();
    '''
  
  console.log sandboxSourceCode

  # Run the script inside a webworker sandbox
  requestId = JSandbox.eval 
    data: sandboxSourceCode
    callback: (result) ->
      # TEMPORARY
      console.log result
      #console.log "Success"
      callback result
    onerror: (data,request) ->
      #console.log prefix + source + postfix
      mecha.logInternalError "Error compiling the solid model."
      #console.log data
  
