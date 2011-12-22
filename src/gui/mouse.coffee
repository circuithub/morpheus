# Utility function to get the mouse coordinates inside an element

mouseCoordsWithinElement = (event) ->
  coords = [0,0]
  if not event
    event = window.event
    coords = [event.x, event.y]
  else
    element = event.target
    totalOffsetLeft = 0
    totalOffsetTop = 0
    while element.offsetParent
      totalOffsetLeft += element.offsetLeft
      totalOffsetTop += element.offsetTop
      element = element.offsetParent
    coords = [event.pageX - totalOffsetLeft, event.pageY - totalOffsetTop]
  return coords

