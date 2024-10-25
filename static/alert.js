export const showAlert = message => {
  const html = String.raw
  const alert = $(html`
    <div data-js-alert-banner role="alert" class="fixed top-0 left-0 w-full h-auto py-2 duration-300 ease-out shadow-sm sm:py-0 sm:h-10 ${message.classes ?? 'bg-slate-800'}">
      <div class="flex items-center justify-between w-full h-full px-3 mx-auto max-w-7xl">
          <a href="${message.link ?? '#'}" class="flex flex-col w-full h-full text-xs leading-6 text-neutral-300 hover:text-white duration-150 ease-out sm:flex-row sm:items-center">
              <strong class="font-semibold">${message.lead}</strong>
              <span class="hidden sm:block mx-3"> | </span>
              <span class="block pt-1 pb-2 leading-none sm:inline sm:pt-0 sm:pb-0">${message.follow}</span>
          </a>
          <button data-js-close class="flex items-center flex-shrink-0 translate-x-1 ease-out duration-150 justify-center w-6 h-6 p-1.5 text-neutral-100 rounded-full hover:text-white">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-full h-full"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
      </div>
    </div>`)

  const existingAlert = $('[data-js-alert-banner]')
  existingAlert.detach()

  alert.prependTo(document.body)
  alert.on('click', '[data-js-close]',() => alert.detach())
  setTimeout(() => alert.detach(), 7500)
}
