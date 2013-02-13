# Log messages to the console if it is available
# See http://paulirish.com/2009/log-a-lightweight-wrapper-for-consolelog/

#morpheusDebug = true

morpheus.log = (if console? and console.log? then -> console.log arguments... else -> return)
morpheus.logDebug = (if morpheusDebug? and morpheusDebug and console? and console.log? then -> console.log arguments... else -> return)
morpheus.logInternalError = (if console? and console.error? then -> console.error arguments... else -> return)
morpheus.logApiError = (if console? and console.error? then -> console.error arguments... else -> return)
morpheus.logApiWarning = (if console? and console.warn? then -> console.warn arguments... else -> return)
morpheus.logException = (locationName, error) ->
  logArgs = ["Uncaught exception in `#{locationName}`:\n"]
  logArgs.push (if error.message? then "#{error.message}\n" else error)
  logArgs.push error.stack if error.stack?
  morpheus.logInternalError logArgs...
  return

safeExport = (name, errorValue, callback) -> 
  safeTry name, callback, (error) ->
    morpheus.logException name, error
    return errorValue

safeTry = (name, callback, errorCallback) ->
  if morpheusDebug? and morpheusDebug
    callback
  else
    return ->
      try
        callback arguments...
      catch error
        errorCallback error
