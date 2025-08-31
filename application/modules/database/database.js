import { logger } from '#application/modules/logger.js'
import postgres from 'postgres'
import EmbeddedPostgres from 'embedded-postgres'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import net from "net"

function randomPort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer()
    server.listen(0, () => {
      const { port } = server.address()
      server.close((err) => err ? reject(err) : resolve(port))
    })
  })
}

const embeddedPostgres = async (db) => {
  const databaseDir = mkdtempSync(path.join(tmpdir(), 'pg-'))
  const pg = new EmbeddedPostgres({
    databaseDir,
    port: await randomPort(),
    persistent: false,
    onLog: msg => logger.info(msg)
  })
  await pg.initialise()
  await pg.start()
  return pg
}

const connect = async (location) => {
  if (!location) {
    throw new Error('Cannot create database. Please provide the DB location')
  }


  const pg = await embeddedPostgres(location)

  // if (location === ':memory:') {

  // 1. connection string
  // 2. embedded inmemory
  // 3. embedded persistent



  const sql = postgres(`postgres://postgres:password@localhost:${pg.options.port}`)
  const stop = async () => pg.stop()

  return { sql, stop }
}

export { connect }

