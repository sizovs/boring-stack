import { logger } from "#modules/logger"
import { startApp } from "./app.js"

const address = await startApp(process.env.PORT)
logger.info(`Running @ ${address}`)

