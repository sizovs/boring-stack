import { TodoError, Todos } from "#application/views/Todos.js"

/**
 * @param {{ app: import("fastify").FastifyInstance }}
 */
export const initTodos = async ({ app, db }) => {

  app.get("/todos", async (request, reply) => {
    return render(request, reply)
  })

  app.delete("/todos/:id", async (request, reply) => {
    db.sql`delete from todos where id = ${request.params.id}`.run()
    return render(request, reply)
  })

  app.post("/todos", async (request, reply) => {
    const description = request.body.description?.trim()
    if (!description) {
      return reply
        .header('HX-Retarget', '#todo-error')
        .render(TodoError, { error: "Task description is required" })
    }

    db.sql`insert into todos (description) values (${description})`.run()
    return render(request, reply)
  })

  const render = async (request, reply) => {
    const todos = db.sql`select * from todos`.all()
    return reply.render(Todos, { todos })
  }
}
