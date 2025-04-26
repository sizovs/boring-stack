import { html } from "#application/modules/html.js"

export const Todos = ({ todos }) => html`
  <main id="main" hx-select-oob="#main, #todo-error">
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
      <div id="todo-error"></div>
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

export const ErrorMsg = ({ message }) => html`
  <small id="todo-error" data-testid="todo-error">
    <style>
      me {
        color: var(--color-red-600);
      }
    </style>
    ${message}
  </small>
`
