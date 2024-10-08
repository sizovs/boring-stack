import cluster from 'node:cluster';
import process from 'node:process';

import { logger } from "#modules/logger"
import { startApp } from "./app.js"

const forks = Number(process.env.FORKS) || 1

if (cluster.isPrimary) {
  for (let i = 0; i < forks; i++) {
    cluster.fork()
  }

  // Refork worker on crash
  cluster.on('exit', (worker, code, signal) => {
    if (code !== 0) {
      logger.info(`Reforking worker ${worker.process.pid}...`)
      cluster.fork()
    }
  })
} else {
  const address = await startApp({ port: process.env.PORT })
  logger.info(`Running @ ${address}`)
}
