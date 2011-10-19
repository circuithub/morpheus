# Compile the source code into a concrete solid model
compileCSM = (source) ->
  #TODO: Do we need to supply our own try-catch block? For now we're just relying on JSandbox's error catching code...
  prefix = 
    '''
    return (function(){
      /* BEGIN SOURCE */
    '''
  postfix =
    '''
      /* END SOURCE */
      return model;
    })();
    '''
  requestId = JSandbox.eval 
    data: prefix + source + postfix
    callback: (result) ->
      console.log result
    onerror: (error) ->
      console.log error
  
