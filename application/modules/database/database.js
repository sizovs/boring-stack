import { logger } from "../../modules/logger.js";
import { retry } from "../../modules/retries.js";
import Database from "better-sqlite3";
import { alwaysArray } from "../arrays.js";

import { Migrator } from "./migrator.js";

export const connect = async (location, verbose = (msg, args) => logger.debug(msg, args)) => {
  if (!location) {
    throw new Error("Cannot create database. Please provide the DB location");
  }

  // If the last connection to a db crashed, then the first new connection to open the database will start a recovery process.
  // So if another db connection tries to query during recovery it will get an SQLITE_BUSY error.
  // We retry connection a few times, because an exclusive lock is held during recovery.
  return retry(() => {
    const db = new Database(location, { verbose });
    const cache = new Map()

    db.pragma("journal_mode = WAL")
    db.pragma("foreign_keys = true")
    db.pragma("busy_timeout = 5000")
    db.pragma("synchronous = normal")

    // Litestream takes over checkpointing and recommends running the app with checkpointing disabled:
    // https://litestream.io/tips/#disable-autocheckpoints-for-high-write-load-servers
    db.pragma("wal_autocheckpoint = 0")

    // Enable memory mapped files for speed and smaller memory footprint in multi-process environments.
    // https://oldmoe.blog/2024/02/03/turn-on-mmap-support-for-your-sqlite-connections/#benchmark-results
    // We set 1gb as a reasonable default, but for larger databases, if memory allows, it can go higher.
    // If it goes too high, the value will be capped at the higher bound enforced by the SQLite at the compile-time.
    db.pragma(`mmap_size = ${1024 * 1024 * 1024}`)

    // Increase cache size to 64mb, the default is 2mb (or slightly higher depending on the SQLite version)
    db.pragma(`cache_size = ${64 * 1024 * -1}`)

    const sql = (fragments, ...bindings) => {
      let query = fragments[0];
      const params = [];

      for (let i = 0; i < bindings.length; ++i) {
        const bind = bindings[i];
        const fragment = fragments[i + 1];

        if (bind?.__raw) {
          query += bind.value + fragment;
        } else if (bind?.__all) {
          query += bind.value.map(() => "?") + fragment
          params.push(...bind.value.map(convert))
        } else {
          query += "?" + fragment
          params.push(convert(bind))
        }
      }

      let stmt = cache.get(query)
      if (!stmt) {
        stmt = db.prepare(query)
        cache.set(query, stmt)
      }

      return {
        run: (...extra) => stmt.run(...params, ...extra),
        get: (...extra) => stmt.get(...params, ...extra),
        all: (...extra) => stmt.all(...params, ...extra),
        pluck: () => ({
          get: (...extra) => stmt.pluck().get(...params, ...extra),
          all: (...extra) => stmt.pluck().all(...params, ...extra),
        }),
      }
    }

    db.sql = sql

    const migrator = new Migrator(db)
    migrator.migrate()

    return { db }
  })
}

function convert(value) {
  if (typeof value === "boolean") {
    return value ? 1 : 0
  }
  if (value !== null && typeof value === "object") {
    return JSON.stringify(value)
  }
  return value
}

export function raw(value) {
  return { __raw: true, value }
}

export function keys(value) {
  return { __keys: true, value }
}

export function values(value) {
  return { __values: true, value }
}

export function all(any) {
  const value = alwaysArray(any)
  return { __all: true, value }
}

