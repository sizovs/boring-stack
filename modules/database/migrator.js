import { basename } from 'path'
import fs from "fs"

export class Migrator {
  #db
  #migrations
  constructor(db, migrations) {
    this.#db = db
    this.#migrations = migrations
  }
  migrate() {

    if (this.#migrations.empty()) {
      return
    }

    const tx = this.#db.transaction(() => {
      const latestVersion = this.#migrations.latest().version
      const databaseVersion = this.databaseVersion()
      const outOfDate = databaseVersion < latestVersion
      if (outOfDate) {
        const targetVersion = databaseVersion + 1
        const migration = this.#migrations.version(targetVersion)
        migration.execute(this.#db)
        return outOfDate
      } else {
        console.log(`Database is up-to-date (v${databaseVersion}).`)
        return outOfDate
      }
    })

    // Keep running migration transactions while DB is out of date
    while (tx.immediate()) {
    }

  }

  databaseVersion() {
    const userVersion = this.#db.prepare('PRAGMA user_version;').get()?.user_version
    if (typeof userVersion !== 'number') {
      throw new Error(`Unexpected result when getting user_version: "${userVersion}".`)
    }
    return userVersion
  }
}

export class Migrations {
  #migrations
  #fs
  constructor(directory, filesystem = fs) {
    this.#fs = filesystem
    this.#migrations = this.migrationFiles(directory).map((file, index) => new Migration(file, index + 1, filesystem))
    console.log(`${this.#migrations.length} migration(s) in directory.`)
  }

  empty() {
    return this.#migrations.length === 0
  }

  version(v) {
    return this.#migrations.find(({ version }) => version === v)
  }

  latest() {
    return this.#migrations.at(-1)
  }

  migrationFiles(path) {
    const sqlFiles = this.#fs.readdirSync(path, { withFileTypes: true })
      .filter((file) => file.isFile() && file.name.endsWith('.sql'))
      .map((sqlFile) => `${path}/${sqlFile.name}`)
      .sort()

    return sqlFiles
  }
}

class Migration {
  #file
  #version
  #fs
  constructor(file, version, fs) {
    this.#file = file;
    this.#version = version
    this.#fs = fs
  }

  execute(db) {
    try {
      console.log(`Migrating to v${this.version} using ${this.name}`)
      db.exec(this.statements)
      db.exec(`PRAGMA user_version = ${this.#version}`)
    } catch (error) {
      const message = `Unable to execute migration ${this.name}: ${error}`
      console.error(message)
      throw new Error(message, { cause: error })
    }
  }

  get version() {
    return this.#version
  }

  get name() {
    return basename(this.#file)
  }

  get statements() {
    return this.#fs.readFileSync(this.#file, { encoding: 'utf8' })
  }
}
