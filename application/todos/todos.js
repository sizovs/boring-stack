/**
* @param {{ app: import("fastify").FastifyInstance, db: import("better-sqlite3").Database app }}
*/
export const initTodos = async ({ app, db, sql }) => {
  const renderTodos = (request, reply) => {
    const todos = sql`select * from todos`.all()
    return reply.render('todos/todos', { todos })
  }

  app.get('/todos', (request, reply) => {
    return renderTodos(request, reply)
  })

  app.delete('/todos/:id', (request, reply) => {
    sql`delete from todos where id = ${request.params.id}`.run()
    return renderTodos(request, reply)
  })

  app.post('/todos', async (request, reply) => {
    const description = request.body.description?.trim()
    if (!description) {
      request.flash('old', request.body)
      request.flash('errors', { 'description': 'Task description is required' })
      return renderTodos(request, reply)
    }

    sql`insert into todos (description) values (${description})`.run()
    return renderTodos(request, reply)
  })

}


