import express from "express"
import logger from "../modules/logger.js"
import Router from "express-promise-router"
import { createDatabase } from "#modules/database/database.js"
import { Migrator } from "#modules/database/migrator.js"
import { initTodos } from "./todos/todos.js"
import { initHealth } from "./health/health.js"
import { enableFlashScope } from "./setup/flash.js"
import { enableSessions } from "./setup/session.js"
import { enableEdgeTemplates } from "./setup/edge.js"
import { enableHttpLogging } from "./setup/morgan.js"
import { enableCors } from "./setup/cors.js"
import { enableBodyParsing } from "./setup/bodyparser.js"
import { cookieSecret } from "#modules/secrets.js"

if (!process.env.DB_LOCATION) {
  throw new Error('DB_LOCATION environment variable is missing.')
}

const envs = ['development', 'production']
if (!envs.includes(process.env.NODE_ENV)) {
  throw new Error(`NODE_ENV environment variable must be one of ${envs}.`)
}

const isDevMode = process.env.NODE_ENV !== "production"

const startApp = (port = 0) => {

  const db = createDatabase(process.env.DB_LOCATION)
  // In dev mode, we run migrations upon startup.
  // In production, migrations are run by the deployment script.
  if (isDevMode) {
    const migrator = new Migrator(db)
    migrator.migrate()
  }

  const app = express()
  enableEdgeTemplates({ app, isDevMode })
  enableSessions({ app, secret: cookieSecret(db) })
  enableFlashScope({ app })
  enableHttpLogging({ app, logger })
  enableCors({ app, isDevMode })
  enableBodyParsing({ app })

  const router = new Router()
  app.use(router)
  app.use('/', (request, response) => {
    response.redirect('/todos')
  })
  initTodos({ router, db })
  initHealth({ router, db })

  return new Promise((resolve, reject) => {
    const server = app.listen(port, () => {
      const address = 'http://localhost:' + server.address().port
      logger.info("Your app is ready on " + address)
      resolve(address)
    })
    server.on('error', error => reject(error))
  })
}

export { startApp }
