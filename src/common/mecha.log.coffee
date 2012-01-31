# Log messages to the console if it is available
# See http://paulirish.com/2009/log-a-lightweight-wrapper-for-consolelog/

mechaDebug = true

mecha.log = (if console? and console.log? then () -> console.log.apply console, arguments else () -> return)
mecha.logInternalError = (if console? and console.error? then () -> console.error.apply console, arguments else () -> return)
mecha.logApiError = (if console? and console.error? then () -> console.error.apply console, arguments else () -> return)
mecha.logApiWarning = (if console? and console.warn? then () -> console.warn.apply console, arguments else () -> return)
mecha.logException = (functionName, error) ->
  logArgs = ["Uncaught exception in `#{functionName}`:\n", "#{error.message}\n"]
  logArgs.push error.stack if error.stack?
  mecha.logInternalError logArgs...
  throw error

safeExport = (name, f) -> 
  if mechaDebug
    f
  else 
    return ->
      try 
        f arguments...
      catch error
        mecha.logException name, error
