import { Layout } from "#application/views/Layout"
import { Todos } from "#application/views/Todos"

/**
 * @param {{ app: import("fastify").FastifyInstance, db: import("better-sqlite3").Database app }}
 */
export const initTodos = async ({ app, sql }) => {

  const renderTodos = (request, reply) => {
    const todos = sql`select * from todos`.all()
    reply.render(Layout(Todos), { todos })
  }

  app.get("/todos", (request, reply) => {
    return renderTodos(request, reply)
  })

  app.delete("/todos/:id", (request, reply) => {
    sql`delete from todos where id = ${request.params.id}`.run()
    return renderTodos(request, reply)
  })

  app.post("/todos", async (request, reply) => {
    const description = request.body.description?.trim()
    if (!description) {
      reply.flash("old", request.body)
      reply.flash("errors", { description: "Task description is required" })
      return renderTodos(request, reply)
    }

    sql`insert into todos (description) values (${description})`.run()
    return renderTodos(request, reply)
  })
}
