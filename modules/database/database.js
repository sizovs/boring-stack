import logger from '#modules/logger.js'
import Database from 'better-sqlite3'

const createDatabase = (location) => {
  if (!location) {
    throw new Error('Cannot create database. Please provide the DB location')
  }
  const db = new Database(location, { verbose: logger.verbose })
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = true')
  db.pragma('busy_timeout = 5000')
  db.pragma('synchronous = normal')
  // Litestream takes over checkpointing and recommends running the app with checkpointing disabled:
  // https://litestream.io/tips/#disable-autocheckpoints-for-high-write-load-servers
  db.pragma('wal_autocheckpoint = 0')

  // Enable memory mapped files for speed and smaller memory footprint in multi-connection environments, such as pm2.
  // https://oldmoe.blog/2024/02/03/turn-on-mmap-support-for-your-sqlite-connections/#benchmark-results
  // We set 128mb as a reasonable default, but for larger databases, if memory allows, it can go higher.
  // If it goes too high, the value will be capped at the higher bound enforced by the SQLite at the compile-time.
  db.pragma(`mmap_size = ${128 * 1024 * 1024}`)

  // Increase cache size to 64mb, the default is 2mb (or slightly higher depending on the SQLite version)
  db.pragma(`cache_size = ${64 * 1024 * -1}`)

  return db
}

export { createDatabase }

