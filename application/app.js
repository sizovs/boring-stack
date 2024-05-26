import express from "express"
import logger from "../modules/logger.js"
import Router from "express-promise-router";
import vine from '@vinejs/vine'
import { createDatabase } from "#modules/database/database.js"
import { Migrator } from "#modules/database/migrator.js"
import { initTodos } from "./todos/todos.js"
import { initHealth } from "./health.js"
import { enableFlashScope } from "./setup/flash.js"
import { enableSessions } from "./setup/session.js";
import { enableEdgeTemplates } from "./setup/edge.js";
import { enableHttpLogging } from "./setup/morgan.js";
import { enableCors } from "./setup/cors.js";
import { enableBodyParsing } from "./setup/bodyparser.js";

await vine.validate({
  data: process.env,
  schema: vine.object({
    DB_LOCATION: vine.string(),
    COOKIE_SECRET: vine.string(),
    NODE_ENV: vine.enum(['development', 'production'])
  })
})

const isDevMode = process.env.NODE_ENV !== "production"

const startApp = (port = 0) => {

  const app = express();
  enableEdgeTemplates({ app, isDevMode })
  enableSessions({ app, secret: process.env.COOKIE_SECRET })
  enableFlashScope({ app })
  enableHttpLogging({ app, logger })
  enableCors({ app, isDevMode })
  enableBodyParsing({ app })

  const db = createDatabase(process.env.DB_LOCATION)
  const router = new Router()
  app.use(router)
  app.use('/', (request, response) => {
    response.redirect('/todos');
  });
  initTodos({ router, db })
  initHealth({ router, db })

  // In dev mode, we run migrations upon startup.
  // In production, migrations are run by the deployment script.
  if (isDevMode) {
    const migrator = new Migrator(db)
    migrator.migrate()
  }

  const server = app.listen(port, () => logger.info("Your app is ready on http://localhost:" + server.address().port))
  return 'http://localhost:' + server.address().port
}

export { startApp }
