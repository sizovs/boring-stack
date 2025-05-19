import { sql } from "#application/modules/database/database.js"
import { ErrorMsg, Todos } from "#application/views/Todos.js"

/**
 * @param {{ app: import("fastify").FastifyInstance, db: import("better-sqlite3").Database }}
 */
export const initTodos = async ({ app, db }) => {

  app.get("/todos", async (request, reply) => {
    return render(request, reply)
  })

  app.delete("/todos/:id", async (request, reply) => {
    db.prepare(sql`delete from todos where id = ?`).run(request.params.id)
    return render(request, reply)
  })

  app.post("/todos", async (request, reply) => {
    const description = request.body.description?.trim()
    if (!description) {
      return reply.render(ErrorMsg, { message: "Task description is required" })
    }

    db.prepare(sql`insert into todos (description) values (?)`).run(description)
    return render(request, reply)
  })

  const render = async (request, reply) => {
    const todos = db.prepare(sql`select * from todos`).all()
    return reply.render(Todos, { todos })
  }
}
