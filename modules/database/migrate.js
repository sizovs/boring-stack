import fs from "fs"
import { createDatabase } from "./database.js"
import path from "path"
import { Migrator, Migrations } from "./migrator.js"

const db = createDatabase(process.env.DB_LOCATION)
const migrationsDirectory = path.resolve(import.meta.dirname, './migrations')
const migrations = new Migrations(migrationsDirectory, fs)
const migrator = new Migrator(db, migrations)
migrator.migrate()
