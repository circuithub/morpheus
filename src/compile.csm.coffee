# Compile the source code into a concrete solid model
compileCSM = (source) ->
  #TODO: Do we need to supply our own try-catch block? For now we're just relying on JSandbox's error catching code...
  prefix = 
    '''
    return (function(){
      /* BEGIN API */

    '''
    + 
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
      #mecha.log prefix + source + postfix
      mecha.log result
    onerror: (data,request) ->
      mecha.log data
      mecha.log d for d in data
      mecha.log request
      #mecha.log e for e in error
  
