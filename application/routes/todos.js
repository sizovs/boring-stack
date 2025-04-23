import { load } from "#application/modules/views.js"

/**
 * @param {{ app: import("fastify").FastifyInstance }}
 */
export const initTodos = async ({ app, sql }) => {

  const renderTodos = async (request, reply) => {
    const { Todos } = await load('Todos.js')
    const { Layout } = await load('Layout.js')
    const todos = sql`select * from todos`.all()
    return reply.render(Layout(Todos), { todos })
  }

  app.get("/todos", async (request, reply) => {
    return renderTodos(request, reply)
  })

  app.delete("/todos/:id", async (request, reply) => {
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
