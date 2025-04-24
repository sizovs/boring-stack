import { html } from "#application/modules/html.js"

export const Todos = ({ todos }) => html`
  <main id="main" class="max-w-md mx-auto mt-16" hx-select-oob="#main, #todo-error">
  <h1
      class="text-4xl mb-4 font-bold tracking-tighter"
      data-testid="todo-count">${todos.length} todo${todos.length === 1 ? "" : "s"}
    </h1>
    ${todos.map(todo => Todo(todo))}
      <input
        hx-post="/todos"
        hx-trigger="keyup[key === 'Enter']"
        data-testid="todo-input"
        placeholder="Type description and hit enter..."
        autofocus
        name="description"
        class="px-0 w-full border-0 border-b border-gray-300 focus:outline-none focus:ring-0 focus:border-black"
      />
      <div id="todo-error"></div>
  </main>
`;

export const Todo = todo => html`
  <label data-testid="todo-item" class="ms-2 font-medium text-gray-900 flex gap-2 items-center mb-4">
    <input
      type="checkbox"
      hx-delete="/todos/${todo.id}"
      hx-swap="swap:0.1s"
      class="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
    />${todo.description}
  </label>
`

export const ErrorMsg = ({ message }) => html`
  <small id="todo-error" data-testid="todo-error" class="text-xs text-red-600">${message}</small>
`
