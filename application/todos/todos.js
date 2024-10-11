export const initTodos = async ({ app, db }) => {
  app.get('/todos', (request, reply) => {
    const todos = db.prepare('select * from todos').all()
    return reply.render('todos', { todos })
  })

  app.post('/todos/:id/done', (request, reply) => {
    db.prepare('delete from todos where id = ?').run(request.params.id)
    reply.redirect('/todos')
  })

  app.post('/todos', async (request, reply) => {
    const description = request.body.description?.trim()
    if (!description) {
      request.flash('old', request.body)
      request.flash('errors', { 'description': 'Task description is required' })
      reply.redirect('/todos')
      return
    }

    db.prepare('insert into todos (description) values (?)').run(description)
    reply.redirect('/todos')
  })

}


