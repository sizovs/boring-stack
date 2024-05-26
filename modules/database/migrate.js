import fs from "fs"
import { db, initializeDatabase } from "./database.js"
import path from "path"
import { Migrator, Migrations } from "./migrator.js"

initializeDatabase()

const migrationsDirectory = path.resolve(import.meta.dirname, './migrations')
const migrations = new Migrations(migrationsDirectory, fs)
const migrator = new Migrator(db, migrations)
migrator.migrate()
