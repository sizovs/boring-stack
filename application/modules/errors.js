import { createHash } from "node:crypto"
import { logger } from "#application/modules/logger.js"

export const errors = (db, defaultContext) => {

  const insertOne = db
    .prepare(`
      INSERT INTO errors (fingerprint, name, message, stack, context) VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(fingerprint) DO UPDATE SET occurrences = occurrences + 1, last_seen = strftime('%Y-%m-%dT%H:%M:%fZ','now')`)

  const capture = (e, context = {}) => {
    logger.error(e)

    const { name, message, stack } = e
    const fingerprint = createHash("md5").update(`${name}|${message}|${stack}`).digest("hex");

    insertOne.run(fingerprint, name, message, stack, JSON.stringify({ ...defaultContext, ...context }))

  }

  return capture
}

