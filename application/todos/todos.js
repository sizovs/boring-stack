export const initTodos = ({ router, db }) => {
  router.get('/todos', (request, response) => {
    const todos = db.prepare('select * from todos').all()
    response.render('todos', { todos })
  })

  router.post('/todos/:id/done', (request, response) => {
    db.prepare('delete from todos where id = ?').run(request.params.id)
    response.redirect('/todos')
  })

  router.post('/todos', async (request, response) => {
    const description = request.body.description?.trim()
    if (!description) {
      request.flash('old', request.body)
      request.flash('errors', { 'description': 'Task description is required' })
      response.redirect('/todos')
      return
    }

    db.prepare('insert into todos (description) values (?)').run(description)
    response.redirect('/todos')
  })

}


