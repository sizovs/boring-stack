import { db } from "#modules/database/database.js";
import Router from "express-promise-router";

const router = new Router()

router.get('/', (request, response) => {
  db.exec('select 1')
  response.send('OK')
})

export default router
