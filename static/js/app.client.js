htmx.config.includeIndicatorStyles = false

// htmx defers “post-swap effects” (focus, autoscroll, adding settled classes) to give the browser one frame to catch up.
// That delay exists to avoid flakiness in real browsers. In headless test environments though, it introduces a race.
// In our specific test case, we rely on autofocus, which is a post-swap effect.
// So we disable the delay entirely to make tests more reliable.
htmx.config.defaultSettleDelay = 0

document.addEventListener('htmx:configRequest', event => {
  const { appversion } = document.body.dataset
  event.detail.headers['x-app-version'] = appversion
})

// ------------
// Closeables (E.g. Alerts)
// ------------
document.addEventListener('click', event => {
  const close = event.target.closest('[data-js-close]')
  if (close) {
    const closeable = close.closest('[data-js-closeable]')
    closeable.remove()
  }
})

// ------------
// Auto-remove
// ------------
document.addEventListener('htmx:afterProcessNode', event => {
  const element = event.detail.elt
  const timing = element.getAttribute('data-js-remove-me')
  if (timing) {
    setTimeout(function () {
      if (element.parentElement)
        element.parentElement.removeChild(element)
    }, htmx.parseInterval(timing))
  }
})
