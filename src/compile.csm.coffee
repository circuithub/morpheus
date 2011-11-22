# Compile the source code into a concrete solid model
compileCSM = (source, callback) ->
  #TODO: Do we need to supply our own try-catch block? For now we're just relying on JSandbox's error catching code...
  prefix = 
    '''
    (function(){
      /* BEGIN API */
      
    ''' + state.api.sourceCode +
    '''
      try {
      /* BEGIN SOURCE */
      return scene(
    
    '''
  postfix =
    '''
      
      );
      } catch(err) {
        return String(err);
      }
    })();
    '''
  #mecha.log prefix + source + postfix
  requestId = JSandbox.eval 
    data: prefix + source + postfix
    callback: (result) ->
      # TEMPORARY
      console.log result
      #console.log "Success"
      callback result
    onerror: (data,request) ->
      #console.log prefix + source + postfix
      mecha.logInternalError "Error compiling the solid model."
      #console.log data
  
