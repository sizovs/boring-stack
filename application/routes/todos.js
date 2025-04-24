import { Layout } from "#application/views/Layout.js"
import { ErrorMsg, Todos } from "#application/views/Todos.js"

/**
 * @param {{ app: import("fastify").FastifyInstance }}
 */
export const initTodos = async ({ app, sql }) => {

  app.get("/todos", async (request, reply) => {
    return render(request, reply)
  })

  app.delete("/todos/:id", async (request, reply) => {
    sql`delete from todos where id = ${request.params.id}`.run()
    return render(request, reply)
  })

  app.post("/todos", async (request, reply) => {
    const description = request.body.description?.trim()
    if (!description) {
      return reply.render(ErrorMsg, { message: "Task description is required" })
    }

    sql`insert into todos (description) values (${description})`.run()
    return render(request, reply)
  })

  const render = async (request, reply) => {
    const todos = sql`select * from todos`.all()
    return reply.render(Layout(Todos), { todos })
  }
}
