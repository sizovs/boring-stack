const handleServerError = () => {
  const error = document.createElement('div');
  error.className = 'flash';
  error.textContent = 'Action failed. Something went wrong while talking to the server.';
  document.body.appendChild(error);
}

document.addEventListener('htmx:sendError', handleServerError);
document.addEventListener('htmx:responseError', handleServerError);
