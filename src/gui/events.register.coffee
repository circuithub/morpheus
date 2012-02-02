# Eventful code comes here
# Program state should not be manipulated outside events files

# Please note the following conventions: 
#
#  * Use jquery delegate in place of live
#    http://jupiterjs.com/news/why-you-should-never-use-jquery-live
#

# Register document events
registerDOMEvents = () ->
  ($ '#mecha-gui').delegate '#mecha-canvas', 'mousedown', mouseDown
  state.viewport.domElement.addEventListener 'mouseup', mouseUp, true
  state.viewport.domElement.addEventListener 'mousemove', mouseMove, true
  state.viewport.domElement.addEventListener 'mousewheel', mouseWheel, true
  state.viewport.domElement.addEventListener 'DOMMouseScroll', mouseWheel, true
  document.addEventListener 'keydown', keyDown, true
  window.addEventListener 'resize', windowResize, true

# Register UI controls events
registerEditorEvents = () ->
  ($ '#mecha-source-compile').click controlsSourceCompile

registerControlEvents = () ->
  ($ '#mecha-param-inputs').delegate '.mecha-param-range', 'change', controlsParamChange
  ($ '#mecha-param-inputs').delegate '.mecha-param-number', 'change', controlsParamChange

