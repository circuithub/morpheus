# Log messages to the console if it is available
# See http://paulirish.com/2009/log-a-lightweight-wrapper-for-consolelog/

#mechaDebug = true

mecha.log = (if console? and console.log? then -> console.log arguments... else -> return)
mecha.logDebug = (if mechaDebug? and mechaDebug and console? and console.log? then -> console.log arguments... else -> return)
mecha.logInternalError = (if console? and console.error? then -> console.error arguments... else -> return)
mecha.logApiError = (if console? and console.error? then -> console.error arguments... else -> return)
mecha.logApiWarning = (if console? and console.warn? then -> console.warn arguments... else -> return)
mecha.logException = (locationName, error) ->
  logArgs = ["Uncaught exception in `#{locationName}`:\n"]
  logArgs.push (if error.message? then "#{error.message}\n" else error)
  logArgs.push error.stack if error.stack?
  mecha.logInternalError logArgs...
  return

safeExport = (name, errorValue, callback) -> 
  safeTry name, callback, (error) ->
    mecha.logException name, error
    return errorValue

safeTry = (name, callback, errorCallback) ->
  if mechaDebug? and mechaDebug
    callback
  else
    return ->
      try
        callback arguments...
      catch error
        errorCallback error
