# Log messages to the console if it is available
# See http://paulirish.com/2009/log-a-lightweight-wrapper-for-consolelog/

mecha.log = (if console? and console.log? then () -> console.log Array.prototype.slice.call arguments else () -> return)

