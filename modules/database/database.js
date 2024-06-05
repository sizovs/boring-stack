import Database from 'better-sqlite3';

const createDatabase = (location) => {
  if (!location) {
    throw new Error('Cannot create database. Please provide the DB location')
  }
  const db = new Database(location, {});
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = true')
  db.pragma('busy_timeout = 5000')
  db.pragma('synchronous = normal')
  // Litestream takes over checkpointing and recommends running the app with checkpointing disabled:
  // https://litestream.io/tips/#disable-autocheckpoints-for-high-write-load-servers
  db.pragma('wal_autocheckpoint = 0')
  return db
}

export { createDatabase }

