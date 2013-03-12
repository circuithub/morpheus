# Eventful code comes here
# Program state should not be manipulated outside events files

# Register document events
registerDOMEvents = () ->
  ($ '#morpheus-gui').on 'mousedown', '#morpheus-canvas', mouseDown
  state.viewport.domElement.addEventListener 'mouseup', mouseUp, true
  state.viewport.domElement.addEventListener 'mousemove', mouseMove, true
  state.viewport.domElement.addEventListener 'mousewheel', mouseWheel, true
  state.viewport.domElement.addEventListener 'DOMMouseScroll', mouseWheel, true
  document.addEventListener 'keydown', keyDown, true
  window.addEventListener 'resize', windowResize, true

# Register UI controls events
registerEditorEvents = () ->
  ($ '#morpheus-source-compile').click controlsSourceCompile

registerControlEvents = () ->
  ($ '#morpheus-param-inputs').on 'change', '.morpheus-param-range', controlsParamChange
  ($ '#morpheus-param-inputs').on 'change', '.morpheus-param-number', controlsParamChange
  ($ '#morpheus-param-inputs').on 'mousedown', '.morpheus-param-range', controlsParamChange
  ($ '#morpheus-param-inputs').on 'mousedown', '.morpheus-param-number', controlsParamChange
  ($ '#morpheus-param-inputs').on 'mouseup', '.morpheus-param-range', controlsParamChange
  ($ '#morpheus-param-inputs').on 'mouseup', '.morpheus-param-number', controlsParamChange

