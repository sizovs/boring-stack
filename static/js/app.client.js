import { showAlert } from "/static/js/alert.client.js"

htmx.config.includeIndicatorStyles = false

$(document).on('htmx:configRequest', event => {
  const { appversion } = document.body.dataset
  event.detail.headers['x-app-version'] = appversion
})

$(document).on('htmx:beforeSwap', event => {
  const { status } = event.detail.xhr
  if (status === 205) {
    showAlert({ lead: '🎉 New Release', follow: 'Please refresh the page to use the latest version' })
    event.detail.shouldSwap = false
  }
})

$(document).on('htmx:responseError', () => {
  showAlert({ lead: 'Action failed', follow: 'Please refresh the page and try again', classes: 'bg-red-700' })
})

$(document).on('htmx:sendError', () => {
  showAlert({ lead: 'Action failed', follow: 'Are you connected to the internet?', classes: 'bg-red-700'})
})
