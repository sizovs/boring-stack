import express from "express"
import logger from "../modules/logger.js"
import Router from "express-promise-router";
import fs from "fs"
import vine from '@vinejs/vine'
import { createDatabase } from "#modules/database/database.js"
import { Migrator, Migrations } from "#modules/database/migrator.js"
import { initTodos } from "./todos/todos.js"
import { initHealth } from "./health.js"
import { flashMiddleware } from "./middlewares/flash.js"
import { sessionMiddleware } from "./middlewares/session.js";
import { edgeMiddleware } from "./middlewares/edge.js";
import { morganMiddleware } from "./middlewares/morgan.js";
import { corsMiddleware } from "./middlewares/cors.js";
import { urlencodedMiddleware } from "./middlewares/urlencoded.js";

await vine.validate({
  data: process.env,
  schema: vine.object({
    DB_LOCATION: vine.string(),
    COOKIE_SECRET: vine.string(),
    NODE_ENV: vine.enum(['development', 'production'])
  })
})

const isDevMode = process.env.NODE_ENV !== "production"

const startApp = async (port) => {

  const app = express();

  // Middlewares
  edgeMiddleware({ app, isDevMode })
  sessionMiddleware({ app, secret: process.env.COOKIE_SECRET })
  flashMiddleware({ app })
  morganMiddleware({ app, logger })
  corsMiddleware({ app, isDevMode })
  urlencodedMiddleware({ app })

  // Routes
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
    const migrationsDirectory = './modules/database/migrations'
    const migrations = new Migrations(migrationsDirectory, fs)
    const migrator = new Migrator(db, migrations)
    migrator.migrate()
  }

  const server = app.listen(port, () => logger.info("Your app is ready on http://localhost:" + server.address().port))
  return 'http://localhost:' + server.address().port
}

export { startApp }
