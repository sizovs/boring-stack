import cluster from 'node:cluster'
import process from 'node:process'

import { logger } from "#modules/logger"
import { startApp } from "./app.js"

const numForks = Number(process.env.FORKS) || 2

// Mapping between pids and wids (wid = worked id that doesn't change between restarts)
const wids = new Map()

// Mapping wids to workers
const workers = new Map()

// Signal for IPC
const APP_STARTED = 'started'

// Signal for IPC
const CLUSTER_HEALTHY = 'healthy'

const broadcast = message => {
  for (const worker of Object.values(cluster.workers)) {
    worker.send(message)
  }
}

class Wrk {
  #pid
  #wid
  #restarts = 0
  constructor(wid) {
    this.#wid = wid
  }

  static new(wid) {
    const worker = cluster.fork( { wid } )
    const pid = worker.process.pid
    const wrk = workers.get(wid) || new Wrk(wid)
    wrk.#pid = pid
    wids.set(pid, wid)
    workers.set(wid, wrk)
    return wrk
  }

  static find(worker) {
    const pid = worker.process.pid
    const wid = wids.get(pid)
    return workers.get(wid)
  }

  healthy() {
    this.#restarts = 0
  }

  exitedOk() {
    workers.delete(this.#wid)
  }

  restart() {
    const attempt = ++this.#restarts
    const maxAttempts = 5
    if (attempt <= maxAttempts) {
      logger.info(`${this.name} restart attempt (${attempt}/${maxAttempts})`)
      setTimeout(() => Wrk.new(this.#wid), 1000)
    } else {
      logger.fatal(`No more restarts attempts for ${this.name}.`)
    }
  }

  get name() {
    return `Worker (wid: ${this.#wid} / pid: ${this.#pid})`
  }

}

if (cluster.isPrimary) {

  let numWorkersHealthy = 0

  for (let wid = 0; wid < numForks; wid++) {
    Wrk.new(wid)
  }

  cluster.on('message', (worker, message) => {
    if (message === APP_STARTED) {
      const wrk = Wrk.find(worker)
      wrk.healthy()
      numWorkersHealthy++
      if (numWorkersHealthy === numForks) {
        broadcast(CLUSTER_HEALTHY)
      }
    }
  })

  cluster.on('exit', (worker, code) => {
    const wrk = Wrk.find(worker)
    const successfulExit = code === 0
    if (successfulExit) {
      wrk.exitedOk()
    } else {
      wrk.restart()
    }
  })

} else {
  const app = await startApp({ port: process.env.PORT })
  process.send(APP_STARTED)
  process.on('message', message => {
    if (message === CLUSTER_HEALTHY) {
      app.healthy()
    }
  })
}
