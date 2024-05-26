import { createDatabase } from "./database.js"
import { Migrator } from "./migrator.js"

const db = createDatabase(process.env.DB_LOCATION)
const migrator = new Migrator(db)
migrator.migrate()
