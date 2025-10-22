import { describe, it } from 'node:test'
import assert from 'node:assert'
import { connect, all, raw } from '../../modules/database/database.js'

describe('database', async () => {

  let stmt = ''
  const logger = log => stmt = log

  const { db } = await connect(":memory:", logger)
  db.exec(`create table super_table (items text, x integer) strict`)

  it('maps booleans', async () => {
    db.sql`select * from super_table where x = ${true} OR x = ${false}`.run()
    assert.equal(stmt, `select * from super_table where x = 1.0 OR x = 0.0`)
  })

  it('maps strings', async () => {
    db.sql`select * from super_table where x = ${'25'} or x = ${25} or items = ${'hello'} or items = ${'hello\''}`.run()
    assert.equal(stmt, `select * from super_table where x = '25' or x = 25.0 or items = 'hello' or items = 'hello'''`)
  })

  it('maps all correctly', async () => {
    db.sql`select * from super_table where items in (${all('Jeff')})`.run()
    assert.equal(stmt, `select * from super_table where items in ('Jeff')`)

    db.sql`select * from super_table where items in (${all(['Jeff', 'Elon'])})`.run()
    assert.equal(stmt, `select * from super_table where items in ('Jeff','Elon')`)

    db.sql`select * from super_table where items in (${all()})`.run()
    assert.equal(stmt, `select * from super_table where items in ()`)

    db.sql`select * from super_table where items in (${all([null, undefined, ''])})`.run()
    assert.equal(stmt, `select * from super_table where items in (NULL,NULL,'')`)

    db.sql`select * from super_table where items in (${all([true, false])})`.run()
    assert.equal(stmt, `select * from super_table where items in (1.0,0.0)`)
  })

  it('maps raw sql', async () => {
    db.sql`select * from super_table ${raw(true ? `where x = 'XXXX'` : '')}`.run()
    assert.equal(stmt, `select * from super_table where x = 'XXXX'`)
  })

  it('maps nested arrays and objects correctly', async () => {
    db.sql`select ${[1, 2, 3]}, ${{ a: 123 }}, ${{ a: "O'Reilly" }}`.run()
    assert.equal(stmt, `select '[1,2,3]', '{"a":123}', '{"a":"O''Reilly"}'`)
  })
})
