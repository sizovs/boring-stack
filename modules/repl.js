import { start } from 'node:repl'
import { connect } from "#modules/database/database"

const repl = start()
const db = await connect(process.env.DB_LOCATION)

repl.context.db = db
