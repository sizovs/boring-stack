const { csrftoken, appversion } = document.currentScript.dataset
htmx.on('htmx:configRequest', event => {
  event.detail.headers['x-csrf-token'] = csrftoken
  event.detail.headers['x-app-version'] = appversion
})

const flash = message => {
  window.dispatchEvent(new CustomEvent('htmx:flash', { detail: message }))
}

htmx.on('htmx:beforeSwap', event => {
  const { status } = event.detail.xhr
  if (status === 205) {
    flash('Your app is out of date. Please refresh the page to use the latest version.')
    event.detail.shouldSwap = false
  }
})

htmx.on('htmx:responseError', () => {
  flash('Action failed. Please refresh the page and try again.')
})

htmx.on('htmx:sendError', () => {
  flash('Action failed. Are you connected to the internet?')
})
