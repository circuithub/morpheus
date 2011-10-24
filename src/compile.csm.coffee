# Compile the source code into a concrete solid model
compileCSM = (source) ->
  #TODO: Do we need to supply our own try-catch block? For now we're just relying on JSandbox's error catching code...
  prefix = 
    '''
    return (function(){
      /* BEGIN API */

    ''' + state.api.sourceCode +
    '''

      /* BEGIN SOURCE */
    
    '''
  postfix =
    '''
    
      /* END SOURCE */
      return model;
    })();
    '''
  #mecha.log prefix + source + postfix
  requestId = JSandbox.eval 
    data: prefix + source + postfix
    callback: (result) ->
      console.log "Success"
      #console.log prefix + source + postfix
      console.log result
    onerror: (data,request) ->
      console.log prefix + source + postfix
      console.log "Error"
      console.log data
      console.log data.toString()
      console.log d for d in data
      console.log request
      #console.log e for e in error
  
