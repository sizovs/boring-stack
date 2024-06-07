import { start } from 'node:repl'
import { db, initializeDb } from "#modules/database/database.js"

const repl = start()
initializeDb()

repl.context.db = db
