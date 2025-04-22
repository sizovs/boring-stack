import { html } from "#application/modules/html.js"

export const Layout = Main => params => html`
  <!DOCTYPE html>
  <html lang="en">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />

      <!-- Scripts -->
      <script src="/static/js/htmx@2.0.3.client.js" defer></script>
      <script type="module" src="/static/js/app.client.js" defer></script>

      <!-- Styles -->
      <link rel="stylesheet" href="/static/css/app-build.css" />
      <link rel="apple-touch-icon" href="/static/favicon.png" />
      <link rel="icon" href="/static/favicon.png" />

      <title>Todos</title>
    </head>

    <body hx-boost="true" data-appversion="${params.appVersion}">
      <header class="mx-auto w-full max-w-screen-xl p-4 py-6 lg:py-8 font-mono">
        <a href="/">boring.todos</a>
      </header>
      $${Main(params)}
      <footer>
        <div class="mx-auto w-full max-w-screen-xl p-4 py-6 lg:py-8">
          <hr class="my-6 border-gray-200 sm:mx-auto  lg:my-8" />
          <div class="sm:flex sm:items-center sm:justify-between">
            <span class="text-sm text-gray-500 sm:text-center">
              © <span>${new Date().getFullYear()}</span>
              <a href="https://sizovs.net" class="hover:underline"
                >Eduards Sizovs</a
              >. All Rights Reserved.
            </span>
          </div>
        </div>
      </footer>
    </body>
  </html>
`;
