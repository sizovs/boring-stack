import { TodoError, Todos } from "#application/views/Todos.js"

/**
 * @param {{ app: import("fastify").FastifyInstance, db: import("better-sqlite3").Database }}
 */
export const initTodos = async ({ app, sql }) => {

  app.get("/todos", async (request, reply) => {
    return render(request, reply)
  })

  app.delete("/todos/:id", async (request, reply) => {
    await sql`delete from todos where id = ${request.params.id}`
    return render(request, reply)
  })

  app.post("/todos", async (request, reply) => {
    const description = request.body.description?.trim()
    if (!description) {
      return reply
        .header('HX-Retarget', '#todo-error')
        .render(TodoError, { error: "Task description is required" })
    }

    await sql`insert into todos (description) values (${description})`
    return render(request, reply)
  })

  const render = async (request, reply) => {
    const todos = await sql`select * from todos`
    return reply.render(Todos, { todos })
  }
}
