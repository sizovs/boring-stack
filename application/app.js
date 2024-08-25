import express from "express"
import logger from "#modules/logger"
import Router from "express-promise-router"
import { createDatabase } from "#modules/database/database"
import { Migrator } from "#modules/database/migrator"
import { initTodos } from "#application/todos/todos"
import { initHealth } from "#application/health/health"
import { enableFlashScope } from "#application/setup/flash"
import { enableSessions } from "#application/setup/session"
import { enableEdgeTemplates } from "#application/setup/edge"
import { enableHttpLogging } from "#application/setup/morgan"
import { enableCors } from "#application/setup/cors"
import { enableBodyParsing } from "#application/setup/bodyparser"
import { cookieSecret } from "#modules/secrets"

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
  initTodos({ router, db })
  initHealth({ router, db })
  app.get('/', (request, response) => {
    response.redirect('/todos')
  })

  return new Promise((resolve, reject) => {
    const server = app.listen(port, () => {
      const address = 'http://localhost:' + server.address().port
      logger.info("Your app is ready on " + address)
      resolve(address)
    })
    server.on('error', reject)
  })
}

export { startApp }
