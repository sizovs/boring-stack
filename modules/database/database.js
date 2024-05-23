import Database from 'better-sqlite3';
const db = new Database(process.env.PWD + "/modules/database/db.sqlite3", {});
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = true')
db.pragma('busy_timeout = 5000')
db.pragma('synchronous = normal')
// Litestream takes over checkpointing and recommends running the app with checkpointing disabled:
// https://litestream.io/tips/#disable-autocheckpoints-for-high-write-load-servers
db.pragma('wal_autocheckpoint = 0')

export { db }

