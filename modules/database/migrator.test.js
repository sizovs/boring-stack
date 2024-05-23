import { fs } from 'memfs';
import { Migrator, Migrations } from './migrator.js'
import Database from 'better-sqlite3';
import { faker } from '@faker-js/faker';
import { test } from '@japa/runner'

test.group('migrator', (group) => {
  let db
  let dir
  group.each.setup(() => {
    db = new Database(":memory:");
    dir = faker.word.sample()
    fs.mkdirSync(dir, { recursive: true })
  })

  test('does nothing if no migrations found', ({ assert }) => {
    const migrations = new Migrations(dir, fs)
    const migrator = new Migrator(db, migrations)
    migrator.migrate()
    assert.equal(migrator.databaseVersion(), 0)
  })

  test('executes migrations only once', ({ assert }) => {
    fs.writeFileSync(`${dir}/00001_foo.sql`, `create table foo (id integer)`)

    const migrations = new Migrations(dir, fs)
    const migrator = new Migrator(db, migrations)
    migrator.migrate()
    migrator.migrate()
    migrator.migrate()

    assert.equal(migrator.databaseVersion(), 1)
  })

  test('executes migrations and bumps database version', ({ assert }) => {
    fs.writeFileSync(`${dir}/00001_foo.sql`, `create table foo (id integer)`)
    fs.writeFileSync(`${dir}/00002_boo.sql`, `create table boo (id integer)`)
    fs.writeFileSync(`${dir}/00003_qux.sql`, `create table qux (id integer)`)

    const migrations = new Migrations(dir, fs)
    const migrator = new Migrator(db, migrations)
    migrator.migrate()

    assert.equal(migrator.databaseVersion(), 3)
  })

  test('executes migrations in order', ({ assert }) => {
    fs.writeFileSync(`${dir}/00000_init.sql`, `create table tbl (txt text); insert into tbl (txt) values ('')`)
    fs.writeFileSync(`${dir}/00001_1st.sql`, `update tbl set txt = concat(txt, '1st')`)
    fs.writeFileSync(`${dir}/00002_2nd.sql`, `update tbl set txt = concat(txt, '2nd')`)
    fs.writeFileSync(`${dir}/00002_3rd.sql`, `update tbl set txt = concat(txt, '3rd')`)

    const migrations = new Migrations(dir, fs)
    const migrator = new Migrator(db, migrations)
    migrator.migrate()

    const { txt } = db.prepare('select txt from tbl').get()
    assert.equal(txt, '1st2nd3rd')
  })

  test('executes each migration in a separate transaction', ({ assert }) => {
    fs.writeFileSync(`${dir}/00001_foo.sql`, `create table foo (id integer)`)
    fs.writeFileSync(`${dir}/00002_boo.sql`, `create tabl`)

    const migrations = new Migrations(dir, fs)
    const migrator = new Migrator(db, migrations)

    assert.throws(
      () => migrator.migrate(),
      'Unable to execute migration 00002_boo.sql: SqliteError: near "tabl": syntax error'
    )

    assert.equal(migrator.databaseVersion(), 1)
  })

})






