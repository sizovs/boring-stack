import Database from 'better-sqlite3';
if (!process.env.DB_LOCATION) {
  throw 'DB_LOCATION env variable is not provided.'
}

const createDatabase = () => {
  const db = new Database(process.env.DB_LOCATION, {});
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = true')
  db.pragma('busy_timeout = 5000')
  db.pragma('synchronous = normal')
  // Litestream takes over checkpointing and recommends running the app with checkpointing disabled:
  // https://litestream.io/tips/#disable-autocheckpoints-for-high-write-load-servers
  db.pragma('wal_autocheckpoint = 0')
  return db;
}

let db = createDatabase()

const recreateDatabase = () => {
  db.close()
  db = createDatabase()
}

export { db, recreateDatabase }

