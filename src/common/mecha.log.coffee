# Log messages to the console if it is available
# See http://paulirish.com/2009/log-a-lightweight-wrapper-for-consolelog/

mecha.log = (if console? and console.log? then () -> console.log.apply console, arguments else () -> return)
mecha.logInternalError = (if console? and console.error? then () -> console.error.apply console, arguments else () -> return)
mecha.logApiError = (if console? and console.error? then () -> console.error.apply console, arguments else () -> return)
mecha.logApiWarning = (if console? and console.warn? then () -> console.warn.apply console, arguments else () -> return)

