const handleServerError = () => {
  const error = document.createElement('div');
  error.className = 'flash';
  error.textContent = 'Action failed. Something went wrong while talking to the server.';
  document.body.appendChild(error);
  setTimeout(() => {
    document.body.removeChild(error);
  }, 3000);
}

document.addEventListener('htmx:afterSwap', handleServerError);
document.addEventListener('htmx:responseError', handleServerError);
