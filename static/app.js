const handleServerError = () => {
  const errorHtml = `<div class="flash">Action failed. Something went wrong while talking to the server.</div>`
  const errorTemplate = document.createElement('template');
  errorTemplate.innerHTML = errorHtml;
  const error = errorTemplate.content.firstChild;
  document.body.appendChild(error);
}
document.addEventListener('htmx:sendError', handleServerError);
document.addEventListener('htmx:responseError', handleServerError);
