import { fs } from 'memfs';
import { Migrator, Migrations } from './migrator.js'
import Database from 'better-sqlite3';
import { faker } from '@faker-js/faker';
import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';

describe('migrator', async () => {
  let db
  let dir
  beforeEach(() => {
    db = new Database(":memory:");
    dir = faker.word.sample()
    fs.mkdirSync(dir, { recursive: true })
  });
  it('does nothing if no migrations found', () => {
    const migrations = new Migrations(dir, fs)
    const migrator = new Migrator(db, migrations)
    migrator.migrate()
    assert.equal(migrator.databaseVersion(), 0)
  })

  it('executes migrations only once', () => {
    fs.writeFileSync(`${dir}/00001_foo.sql`, `create table foo (id integer)`)

    const migrations = new Migrations(dir, fs)
    const migrator = new Migrator(db, migrations)
    migrator.migrate()
    migrator.migrate()
    migrator.migrate()

    assert.equal(migrator.databaseVersion(), 1)
  })

  it('executes migrations and bumps database version', () => {
    fs.writeFileSync(`${dir}/00001_foo.sql`, `create table foo (id integer)`)
    fs.writeFileSync(`${dir}/00002_boo.sql`, `create table boo (id integer)`)
    fs.writeFileSync(`${dir}/00003_qux.sql`, `create table qux (id integer)`)

    const migrations = new Migrations(dir, fs)
    const migrator = new Migrator(db, migrations)
    migrator.migrate()

    assert.equal(migrator.databaseVersion(), 3)
  })

  it('executes migrations in order', () => {
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

  it('executes each migration in a separate transaction', () => {
    fs.writeFileSync(`${dir}/00001_foo.sql`, `create table foo (id integer)`)
    fs.writeFileSync(`${dir}/00002_boo.sql`, `create tabl`)

    const migrations = new Migrations(dir, fs)
    const migrator = new Migrator(db, migrations)

    assert.throws(() =>
      migrator.migrate(),
      new Error('Unable to execute migration 00002_boo.sql: SqliteError: near "tabl": syntax error')
    )

    assert.equal(migrator.databaseVersion(), 1)
  })
});

