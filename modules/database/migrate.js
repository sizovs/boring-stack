import { connect } from "./database.js"
import { Migrator } from "./migrator.js"

const db = await connect(process.env.DB_LOCATION)
const migrator = new Migrator(db)
migrator.migrate()
