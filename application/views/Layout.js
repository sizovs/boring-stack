import { html } from "../modules/html.js";

export const Layout = Main => params => html`
  <!DOCTYPE html>
  <html lang="en">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <meta name="description" content="A boring todo app" />
      <!-- Scripts -->
      <script src="/static/js/htmx@2.0.6.client.js"></script>
      <script src="/static/js/css-scope-inline.js"></script>
      <script type="module" src="/static/js/app.client.js" defer></script>
      <!-- Styles -->
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
          @media sm {
            me {
              font-size: var(--scale-2);
            }
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
