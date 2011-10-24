# Compile the source code into a concrete solid model
compileCSM = (source) ->
  #TODO: Do we need to supply our own try-catch block? For now we're just relying on JSandbox's error catching code...
  prefix = 
    '''
    (function(){
      /* BEGIN API */
      
    ''' + state.api.sourceCode +
    '''
      
      /* BEGIN SOURCE */
      return scene(
    
    '''
  postfix =
    '''
      
      );
    })();
    '''
  #mecha.log prefix + source + postfix
  requestId = JSandbox.eval 
    data: prefix + source + postfix
    callback: (result) ->
      console.log "Success"
      console.log result
    onerror: (data,request) ->
      #console.log prefix + source + postfix
      console.log "Error"
      console.log data
  
