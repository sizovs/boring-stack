import { html } from "../modules/html.js"

export const Admin = ({ errors }) => html`
  <main>
    <style>
      me {
        margin: 0 auto;
        max-width: var(--width-xl);
        margin-top: var(--size-8);
      }
      me h1 {
        font-size: var(--scale-6);
        margin-bottom: var(--size-4);
        letter-spacing: var(--letter-xs);
      }
    </style>
    <h1>Last 10 errors</h1>
    <table>
      <style>
        me {
          width: 100%;
        }

        me tr {
          border-bottom: 1px solid var(--color-grey-200);
        }

        me tr.hidden {
          display: none;
        }

        me tr.expandable {
          font-size: var(--scale-000);
        }

        me tr.clickable {
          cursor: pointer;
        }

        me tbody td, me th {
          text-align: left;
          padding: var(--size-2);
        }

      </style>
      <thead>
        <tr>
          <th>Error</th>
          <th>Seen (last / first / times)</th>
        </tr>
      </thead>
      ${errors.map(Error)}
    </table>
    <script>
      document.querySelectorAll('tr.clickable').forEach(row => {
        row.addEventListener('click', () => {
          row.nextElementSibling.classList.toggle('hidden')
        })
      })
    </script>
  </main>
`

const ms = ms => {
  const diff = (Date.now() - ms) / 1000
  if (diff < 60) return `${Math.floor(diff)}s`
  if (diff < 3600) return `${Math.floor(diff / 60)}m`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`
  return `${Math.floor(diff / 86400)}d`
}

const Error = error => html`
  <tr class="clickable">
    <td>
      (${error.source}) ${error.name}: ${error.message}
    </td>
    <td>
      ${ms(error.last_seen)} / ${ms(error.first_seen)} / ${error.occurrences}×
    </td>
  </tr>
  <tr class="expandable hidden">
    <td colspan="2">
      <pre>${error.stack}</pre>
      <br>
      ${Object.entries(JSON.parse(error.context)).map(Context)}
    </td>
  </tr>
`

const Context = ([k, v]) => html`
  <div><strong>${k}:</strong> ${v}</div>
`
