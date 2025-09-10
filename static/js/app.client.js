// ------------
// Error reporting
// ------------

// Queue to store pending errors
const queue = []

const FLUSH_INTERVAL = 1500 // Flush every 1.5s
const MAX_ERRORS = 1        // Max number of errors to send (e.g. to avoid sending gazillions in case of an infinite loop)

// Error context to send alongside with errors
const context = {
  url: location.href,
  ua: navigator.userAgent,
  platform: navigator.userAgentData?.platform || navigator.platform || 'unknown',
}

// Send all queued errors
function flush() {
  if (queue.length === 0) return

  // Ensure we only send up to MAX_ERRORS
  const errors = queue.splice(0, MAX_ERRORS)

  navigator.sendBeacon("/js-error", JSON.stringify({
    context,
    errors
  }))

}

function capture(e) {
  if (!(e instanceof Error)) {
    console.warn("Not an Error instance. Skipping sending to the server.", e)
    return
  }

  const { name, message, stack } = e
  if (!name || !message || !stack) {
    console.warn("Error doesn't have required properties. Skipping sending to the server.", e)
    return
  }

  const key = `js-error:${name}|${message}|${stack}`

  const sentAlready = sessionStorage.getItem(key)
  if (!sentAlready) {
    queue.push({ name, message, stack })
    sessionStorage.setItem(key, '1') // mark as sent
  }
}


// Capture runtime errors
window.addEventListener("error", event => capture(event.error))

// Capture unhandled Promise rejections
window.addEventListener("unhandledrejection", event => capture(event.reason))

// Flush on page unload
window.addEventListener("pagehide", flush)
window.addEventListener("beforeunload", flush)

// Periodic flush
setInterval(flush, FLUSH_INTERVAL)


// --------------------------
// HTMX configuration
// --------------------------

htmx.config.includeIndicatorStyles = false

// htmx defers “post-swap effects” (focus, autoscroll, adding settled classes) to give the browser one frame to catch up.
// That delay exists to avoid flakiness in real browsers. In headless test environments though, it introduces a race.
// In our specific test case, we rely on autofocus, which is a post-swap effect.
// So we disable the delay entirely to make tests more reliable.
htmx.config.defaultSettleDelay = 0

// The default value includes 'class' as well.
// We exclude it, otherwise classes added by MutationObserver are being removed during settling
htmx.config.attributesToSettle = ["style", "width", "height"]

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
