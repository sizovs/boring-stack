import { html } from "#application/modules/html.js"

export const Todos = ({ todos }) => html`
  <main hx-target="this" hx-target-422="#todo-error" hx-swap="outerHTML">
  <style>
    me {
      margin: 0 auto;
      max-width: var(--width-xs);
      margin-top: var(--size-8);
    }
    me h1 {
      font-size: var(--scale-6);
      margin-bottom: var(--size-4);
      letter-spacing: var(--letter-xs);
    }
  </style>
  <h1 data-testid="todo-count">${todos.length} todo${todos.length === 1 ? "" : "s"}</h1>
    ${todos.map(todo => Todo(todo))}
    <input
      type="text"
      hx-post="/todos"
      hx-trigger="keyup[key === 'Enter']"
      data-testid="todo-input"
      placeholder="Type description and hit enter..."
      autofocus
      name="description"
    />
    ${TodoError()}
  </main>
`;

export const Todo = todo => html`
  <label data-testid="todo-item">
    <style>
      me {
        margin-bottom: var(--size-3);
      }
    </style>
    <input
      type="checkbox"
      hx-delete="/todos/${todo.id}"
      hx-swap="swap:0.1s"
    />${todo.description}
  </label>
`

export const TodoError = ({ error = '' } = {}) => html`
    <small data-testid="todo-error" id="todo-error">
      <style>
        me {
          color: var(--color-red-600);
        }
      </style>
      ${error}
    </small>
`
