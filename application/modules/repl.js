import { start } from 'node:repl'
import { connect } from "#application/modules/database/database"

const repl = start()
const { db, sql } = await connect(process.env.DB_LOCATION)

repl.context.db = db
repl.context.sql = sql
