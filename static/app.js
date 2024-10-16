htmx.on('htmx:configRequest', event => {
  const { appversion } = document.body.dataset
  event.detail.headers['x-app-version'] = appversion
})

const triggerAlert = message => {
  window.dispatchEvent(new CustomEvent('alert:show', { detail: message }))
}

htmx.on('htmx:beforeSwap', event => {
  const { status } = event.detail.xhr
  if (status === 205) {
    triggerAlert({ lead: '🎉 New Release', follow: 'Please refresh the page to use the latest version' })
    event.detail.shouldSwap = false
  }
})

htmx.on('htmx:responseError', () => {
  triggerAlert({ lead: 'Action failed', follow: 'Please refresh the page and try again', classes: 'bg-red-700' })
})

htmx.on('htmx:sendError', () => {
  triggerAlert({ lead: 'Action failed', follow: 'Are you connected to the internet?', classes: 'bg-red-700'})
})
