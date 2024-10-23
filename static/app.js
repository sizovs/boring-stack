htmx.config.includeIndicatorStyles = false

$(document).on('htmx:configRequest', event => {
  const { appversion } = document.body.dataset
  event.detail.headers['x-app-version'] = appversion
})

$(document).on('htmx:beforeSwap', event => {
  const { status } = event.detail.xhr
  if (status === 205) {
    triggerAlert({ lead: '🎉 New Release', follow: 'Please refresh the page to use the latest version' })
    event.detail.shouldSwap = false
  }
})

$(document).on('htmx:responseError', () => {
  triggerAlert({ lead: 'Action failed', follow: 'Please refresh the page and try again', classes: 'bg-red-700' })
})

$(document).on('htmx:sendError', () => {
  triggerAlert({ lead: 'Action failed', follow: 'Are you connected to the internet?', classes: 'bg-red-700'})
})

const triggerAlert = message => {
  const html = String.raw
  const alert = $(html`
    <div id="alert" role="alert" class="fixed top-0 left-0 w-full h-auto py-2 duration-300 ease-out shadow-sm sm:py-0 sm:h-10 ${message.classes ?? 'bg-slate-800'}">
      <div class="flex items-center justify-between w-full h-full px-3 mx-auto max-w-7xl">
          <a href="${message.link ?? '#'}" class="flex flex-col w-full h-full text-xs leading-6 text-neutral-300 hover:text-white duration-150 ease-out sm:flex-row sm:items-center">
              <strong class="font-semibold">${message.lead}</strong>
              <span class="hidden sm:block mx-3"> | </span>
              <span class="block pt-1 pb-2 leading-none sm:inline sm:pt-0 sm:pb-0">${message.follow}</span>
          </a>
          <button id="close" class="flex items-center flex-shrink-0 translate-x-1 ease-out duration-150 justify-center w-6 h-6 p-1.5 text-neutral-100 rounded-full hover:text-white">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-full h-full"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
      </div>
    </div>`)

  const existingAlert = $('#alert')
  existingAlert.detach()

  alert.prependTo(document.body)
  alert.on('click', '#close',() => alert.detach())
  setTimeout(() => alert.detach(), 7500)
}
