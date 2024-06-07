import vine from '@vinejs/vine'
import { validateBody } from "#modules/validator.js"

export const initTodos = ({ router, db }) => {
  router.get('/todos', (request, response) => {
    const todos = db.prepare('select * from todos').all()
    response.render('todos', { todos })
  })

  router.post('/todos/:id/done', (request, response) => {
    db.prepare('delete from todos where id = ?').run(request.params.id)
    response.redirect('/todos')
  })

  const schema = vine.compile(
    vine.object({
      description: vine.string()
    })
  )

  router.post('/todos', async (request, response) => {
    const [newTodo, errors] = await validateBody(request, schema)
    if (errors) {
      response.redirect('/todos')
      return
    }

    db.prepare('insert into todos (description) values (?)').run(newTodo.description)
    response.redirect('/todos')
  })

}


