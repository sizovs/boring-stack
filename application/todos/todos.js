import { db } from "#modules/database/database.js";
import Router from "express-promise-router";

import vine from '@vinejs/vine'
import { validateBody } from "#modules/validator.js";

const router = new Router()

router.get('/', (request, response) => {
  const todos = db.prepare('select * from todos').all()
  response.render('todos', { todos });
})

router.post('/:id/done', (request, response) => {
  db.prepare('delete from todos where id = ?').run(request.params.id)
  response.redirect('/todos')
})

const schema = vine.compile(
  vine.object({
    description: vine.string()
  })
)

router.post('/', async (request, response) => {
  const [newTodo, errors] = await validateBody(request, schema)
  if (errors) {
    response.redirect('/todos')
    return
  }

  db.prepare('INSERT INTO todos (description) VALUES (?)').run(newTodo.description)
  response.redirect('/todos')
})

export default router



