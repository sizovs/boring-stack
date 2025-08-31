import { basename } from 'path'
import fs from "fs"
import { logger } from '#application/modules/logger.js'

export class Migrator {

  /** @type {import('postgres').Sql} */
  sql

  #migrations
  constructor(sql, migrations = new Migrations()) {
    this.sql = sql
    this.#migrations = migrations
  }

  async migrate() {
    if (this.#migrations.empty()) {
      logger.info('No migrations found, skipping.')
      return
    }

    const currentVersion = await this.databaseVersion()
    const latestVersion = this.#migrations.latest().version
    const outOfDate = currentVersion < latestVersion
    if (outOfDate) {
      const migration = this.#migrations.version(currentVersion + 1)
      await this.sql.begin(async sql => {
        await migration.execute(sql)
      })

      await this.migrate()
    } else {
      logger.info('Database is up-to-date.')
    }
  }

  async databaseVersion() {
    const [{ comment }] = await this.sql`
      SELECT obj_description(oid) AS comment
      FROM pg_namespace
      WHERE nspname = 'public'
    `.simple()

    if (!comment) return 0

    const match = comment.match(/version:(?<v>\d+)/)
    return match?.groups?.v ? parseInt(match.groups.v, 10) : 0
  }

}

export class Migrations {
  #migrations
  #fs
  constructor(directory = import.meta.dirname + '/migrations', filesystem = fs) {
    this.#fs = filesystem
    this.#migrations = this.migrationFiles(directory).map((file, index) => new Migration(file, index + 1, filesystem))
    logger.debug(`${this.#migrations.length} migration(s) in directory.`)
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
    this.#file = file
    this.#version = version
    this.#fs = fs
  }

  /** @param {import('postgres').Sql} sql */
  async execute(sql) {
    try {
      logger.info(`Migrating to v${this.version} using ${this.name}`)
      await sql.unsafe(this.statements)
      await sql.unsafe(`COMMENT ON SCHEMA public IS 'version:${this.version}'`)
    } catch (error) {
      const message = `Unable to execute migration ${this.name}: ${error}`
      logger.error(message)
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
