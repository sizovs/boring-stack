export const initTodos = async ({ app, db }) => {

  const renderTodos = (request, reply) => {
    const todos = db.prepare('select * from todos').all()
    return reply.render('todos', { todos })
  }

  app.get('/todos', (request, reply) => {
    return renderTodos(request, reply)
  })

  app.delete('/todos/:id', (request, reply) => {
    db.prepare('delete from todos where id = ?').run(request.params.id)
    return renderTodos(request, reply)
  })

  app.post('/todos', async (request, reply) => {
    const description = request.body.description?.trim()
    if (!description) {
      request.flash('old', request.body)
      request.flash('errors', { 'description': 'Task description is required' })
      return renderTodos(request, reply)
    }

    db.prepare('insert into todos (description) values (?)').run(description)
    return renderTodos(request, reply)
  })

}


