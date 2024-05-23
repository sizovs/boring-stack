import { readFileSync, readdirSync } from 'fs'
import { join } from "path"
import { db } from './database.js'

export const migrate = (
  migrationsDirectory = join(import.meta.dirname, './migrations'),
) => {

  const migrations = getMigrations(migrationsDirectory)
  const maxVersion = getMaximumVersion(migrations)
  const targetVersion = maxVersion

  const migrate = db.transaction(
    (targetVersion, maxVersion) => {
      const currentVersion = getDatabaseVersion(db)
      if (maxVersion < currentVersion) {
        return true
      } else {
        if (currentVersion === targetVersion) {
          return true
        } else if (currentVersion < targetVersion) {
          upgrade()
          return false
        } else {
          downgrade()
          return false
        }
      }
    },
  )

  while (true) {
    const done = migrate.immediate(targetVersion, maxVersion)
    if (done) break
  }

  function upgrade() {
    const currentVersion = getDatabaseVersion(db)
    const targetVersion = currentVersion + 1

    const migration = migrations.find((x) => x.version === targetVersion)
    if (!migration) {
      throw new Error(`Cannot find migration for version ${targetVersion}`)
    }

    try {
      for (const up of migration.up) {
        console.log(db)
        const stmt = db.prepare(up);
        stmt.run()
      }
    } catch (error) {
      console.error(
        `Upgrade from version ${currentVersion} to version ${targetVersion} failed.`,
      )
      throw error
    }
    setDatabaseVersion(db, targetVersion)
  }

  function downgrade() {
    const currentVersion = getDatabaseVersion(db)
    const targetVersion = currentVersion - 1

    const migration = migrations.find((x) => x.version === currentVersion)
    if (!migration) {
      throw new Error(`Cannot find migration for version ${targetVersion}`)
    }

    try {
      db.exec(migration.down)
    } catch (e) {
      console.error(
        `Downgrade from version ${currentVersion} to version ${targetVersion} failed.`,
      )
      throw e
    }
    setDatabaseVersion(db, targetVersion)
  }
}

export const getMaximumVersion = (migrations) => {
  return migrations.reduce((max, cur) => Math.max(cur.version, max), 0)
}

export const getDatabaseVersion = (db) => {
  const result = db.prepare('PRAGMA user_version;').get()
  if (typeof (result)?.user_version === 'number') {
    return (result)?.user_version
  }
  throw new Error(`Unexpected result when getting user_version: "${result}".`)
}

export const setDatabaseVersion = (db, version) => {
  db.exec(`PRAGMA user_version = ${version}`)
}

export const readMigrationFiles = (path) => {
  const sqlFiles = readdirSync(path, { withFileTypes: true })
    .filter((file) => file.isFile() && file.name.endsWith('.sql'))
    .map((sqlFile) => `${path}/${sqlFile.name}`)
    .sort()

  return sqlFiles
}

export const getMigrations = (path) => {
  const migrationFilesPaths = readMigrationFiles(path)

  const migrations = []

  for (let i = 0; i < migrationFilesPaths.length; i++) {
    const filePath = migrationFilesPaths[i]
    const fileContent = readFileSync(filePath, { encoding: 'utf8' })

    const up = parseSqlContent(fileContent)

    const migration = {
      up,
      down: '',
      version: i + 1,
    }
    migrations.push(migration)
  }

  return migrations
}

/**
 * A single .sql file can contain multiple sql statements
 * splitted by an empty line
 */
export const parseSqlContent = (content) => {
  const parts = content
    .split(/\n\n/gm)
    .map((v) => v.trim())
    .filter((v) => v.length > 0)
  return parts
}

migrate()
