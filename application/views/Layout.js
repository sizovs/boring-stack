import { html } from "#application/modules/html.js"

export const Layout = Main => params => html`
  <!DOCTYPE html>
  <html lang="en">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <meta name="description" content="A boring todo app" />
      <!-- Scripts -->
      <script src="/static/js/htmx@2.0.4.client.js"></script>
      <script>
        // The default value includes 'class' as well.
        // We exclude it, otherwise classes added by MutationObserver are being removed during settling
        htmx.config.attributesToSettle = ["style", "width", "height"]
      </script>

      <script type="module" src="/static/js/app.client.js" defer></script>
      <script>
        // 🌘 CSS Scope Inline (https://github.com/gnat/css-scope-inline)
        window.cssScopeCount ??= 1 // Let extra copies share the scope count.
        window.cssScope ??= new MutationObserver(mutations => { // Allow 1 observer.
          document?.body?.querySelectorAll('style:not([ready])').forEach(node => { // Faster than walking MutationObserver results when receiving subtree (DOM swap, htmx, ajax, jquery).
            var scope = 'me__'+(window.cssScopeCount++) // Ready. Make unique scope, example: .me__1234
            node.parentNode.classList.add(scope)
            node.textContent = node.textContent
            .replace(/(?:^|\.|(\s|[^a-zA-Z0-9\-\_]))(me)(?![a-zA-Z])/g, '$1.'+scope)
            .replace(/((@keyframes|animation:|animation-name:)[^{};]*)\.me__/g, '$1me__') // Optional. Removes need to escape names, ex: "\.me"

            node.setAttribute('ready', '')
          })
        }).observe(document.documentElement, { childList: true, subtree: true })
      </script>

      <!-- Styles -->
      <link rel="stylesheet" href="/static/css/pollen@5.0.2.css" />
      <link rel="stylesheet" href="/static/css/reset.css" />
      <link rel="stylesheet" href="/static/css/app.css" />
      <link rel="apple-touch-icon" href="/static/favicon.png" />
      <link rel="icon" href="/static/favicon.png" />

      <title>Todos</title>
    </head>

    <body data-appversion="${params.appVersion}">
      <style>
        me {
          font-family: var(--font-sans);
        }
      </style>
      <header>
        <style>
          me {
            padding: var(--size-8);
            margin: 0 auto;
            max-width: var(--width-lg);
          }
        </style>
        <a href="/" hx-boost="true">boring.todos</a>
      </header>
      ${Main(params)}
      <footer>
          <style>
              me {
                text-align: center;
                max-width: var(--width-lg);
                margin: 0 auto;
                padding: var(--size-8) 0;
                color: var(--color-grey-600);
              }
          </style>
          © ${new Date().getFullYear()}
          <a href="https://sizovs.net">Eduards Sizovs</a>. All Rights Reserved.
      </footer>
    </body>
  </html>
`;
