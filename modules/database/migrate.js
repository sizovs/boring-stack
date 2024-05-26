import fs from "fs"
import { db, initializeDb } from "./database.js"
import path from "path"
import { Migrator, Migrations } from "./migrator.js"

initializeDb()

const migrationsDirectory = path.resolve(import.meta.dirname, './migrations')
const migrations = new Migrations(migrationsDirectory, fs)
const migrator = new Migrator(db, migrations)
migrator.migrate()
