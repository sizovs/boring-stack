import { fs } from 'memfs'
import { Migrator, Migrations } from './migrator.js'
import { faker } from '@faker-js/faker'
import { describe, it, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert'
import { connect } from './database.js'

describe('migrator', async () => {
  let sql
  let dir
  let close

  beforeEach(async () => {
    const connection = await connect(":memory:")
    sql = connection.sql
    close = connection.stop

    dir = faker.word.sample()
    fs.mkdirSync(dir, { recursive: true })
  })

  afterEach(async () => {
    await close()
  })

  it('does nothing if no migrations found', async () => {
    const migrations = new Migrations(dir, fs)
    const migrator = new Migrator(sql, migrations)
    await migrator.migrate()
    assert.equal(await migrator.databaseVersion(), 0)
  })

  it('executes migrations only once', async () => {
    fs.writeFileSync(`${dir}/00001_foo.sql`, `create table foo (id integer)`)

    const migrations = new Migrations(dir, fs)
    const migrator = new Migrator(sql, migrations)
    await migrator.migrate()
    await migrator.migrate()
    await migrator.migrate()

    assert.equal(await migrator.databaseVersion(), 1)
  })

  it('executes migrations and bumps database version', async () => {
    fs.writeFileSync(`${dir}/00001_foo.sql`, `create table foo (id integer)`)
    fs.writeFileSync(`${dir}/00002_boo.sql`, `create table boo (id integer)`)
    fs.writeFileSync(`${dir}/00003_qux.sql`, `create table qux (id integer)`)

    const migrations = new Migrations(dir, fs)
    const migrator = new Migrator(sql, migrations)
    await migrator.migrate()

    assert.equal(await migrator.databaseVersion(), 3)
  })

  it('executes migrations in order', async () => {
    fs.writeFileSync(`${dir}/00000_init.sql`, `create table tbl (txt text); insert into tbl (txt) values ('')`)
    fs.writeFileSync(`${dir}/00001_1st.sql`, `update tbl set txt = concat(txt, '1st')`)
    fs.writeFileSync(`${dir}/00002_2nd.sql`, `update tbl set txt = concat(txt, '2nd')`)
    fs.writeFileSync(`${dir}/00002_3rd.sql`, `update tbl set txt = concat(txt, '3rd')`)

    const migrations = new Migrations(dir, fs)
    const migrator = new Migrator(sql, migrations)
    await migrator.migrate()

    const [{ txt }] = await sql`select txt from tbl`
    assert.equal(txt, '1st2nd3rd')
  })

  it('executes each migration in a separate transaction', async () => {
    fs.writeFileSync(`${dir}/00001_foo.sql`, `create table foo (id integer)`)
    fs.writeFileSync(`${dir}/00002_boo.sql`, `create tabl`)

    const migrations = new Migrations(dir, fs)
    const migrator = new Migrator(sql, migrations)

    await assert.rejects(async () =>
      await migrator.migrate(),
      new Error('Unable to execute migration 00002_boo.sql: PostgresError: syntax error at or near "tabl"')
    )

    assert.equal(await migrator.databaseVersion(), 1)
  })
})

