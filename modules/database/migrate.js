import { db } from './database.js'
import { join } from "path"
import fs from "fs"

import { Migrator, Migrations } from './migrator.js'

const migrationsDirectory = join(import.meta.dirname, './migrations')
const migrations = new Migrations(migrationsDirectory, fs)
const migrator = new Migrator(db, migrations)
migrator.migrate()
