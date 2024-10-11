import cluster from 'node:cluster'
import process from 'node:process'

import { logger } from "#modules/logger"
import { startApp } from "./app.js"

const numForks = Number(process.env.FORKS) || 2

// Mapping between pids and wids (wid = worked id that doesn't change between restarts)
const wids = new Map()

// Mapping wids to workers
const workers = new Map()

// Mapping between wids and number of restart attempts
const restartAttempts = new Map()

// Signal for IPC
const APP_READY = 'ready'

class Wrk {
  #pid
  #wid
  constructor(pid, wid) {
    this.#pid = pid
    this.#wid = wid
  }

  static new(wid) {
    const worker = cluster.fork()
    const pid = worker.process.pid
    wids.set(pid, wid)
    workers.set(wid, new Wrk(pid, wid))
  }

  static find(worker) {
    const pid = worker.process.pid
    const wid = wids.get(pid)
    return workers.get(wid)
  }

  ready() {
    restartAttempts.delete(this.#wid)
  }

  exitedOk() {
    restartAttempts.delete(this.#wid)
  }

  restart() {
    const attempt = restartAttempts.get(this.#wid) || 1
    const maxAttempts = 5
    if (attempt <= maxAttempts) {
      logger.info(`${this.name} restart attempt (${attempt}/${maxAttempts})`)
      setTimeout(() => Wrk.new(this.#wid), 1000)
      restartAttempts.set(this.#wid, attempt + 1)
    } else {
      logger.fatal(`No more restarts attempts for ${this.name}.`)
    }
  }

  get name() {
    return `Worker (wid: ${this.#wid} / pid: ${this.#pid})`
  }

}

if (cluster.isPrimary) {
  for (let wid = 0; wid < numForks; wid++) {
    Wrk.new(wid)
  }

  cluster.on('message', (worker, message) => {
    if (message === APP_READY) {
      Wrk.find(worker).ready()
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
  const address = await startApp({ port: process.env.PORT })
  logger.info(`Running @ ${address}`)
  process.send(APP_READY)
}
