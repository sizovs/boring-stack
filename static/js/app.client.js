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
// No internet
// ------------
document.addEventListener('htmx:sendError', () => {
  htmx.swap("body", "<div role='alert' remove-me='5s' class='fixed bottom-0 w-full bg-red-700 text-white p-2'>Network error. Could not reach the server.</div>", { swapStyle: "beforeend" });
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
