htmx.config.includeIndicatorStyles = false

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
  const timing = element.getAttribute('remove-me')
  if (timing) {
    setTimeout(function () {
      if (element.parentElement)
        element.parentElement.removeChild(element)
    }, htmx.parseInterval(timing))
  }
})
