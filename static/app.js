const csrfToken = document.currentScript.dataset.csrftoken
htmx.on('htmx:configRequest', (event) => {
  if (csrfToken) {
    event.detail.headers['x-csrf-token'] = csrfToken
  }
})
