import { describe, it } from 'node:test'
import assert from 'node:assert'
import { connect, oneOf, raw } from '#modules/database/database'

describe('database', async () => {

  let stmt = ''
  const logger = log => stmt = log

  const { db, sql } = await connect(":memory:", logger)
  db.exec(`create table super_table (items text, x integer) strict`)

  it('maps booleans', async () => {
    sql`select * from super_table where x = ${true} OR x = ${false}`.run()
    assert.equal(stmt, `select * from super_table where x = 1.0 OR x = 0.0`)
  })

  it('maps strings', async () => {
    sql`select * from super_table where x = ${'25'} or x = ${25} or items = ${'hello'} or items = ${'hello\''}`.run()
    assert.equal(stmt, `select * from super_table where x = '25' or x = 25.0 or items = 'hello' or items = 'hello'''`)
  })

  it('maps oneOf correctly', async () => {
    sql`select * from super_table where items in (${oneOf('Jeff')})`.run()
    assert.equal(stmt, `select * from super_table where items in ('Jeff')`)

    sql`select * from super_table where items in (${oneOf(['Jeff', 'Elon'])})`.run()
    assert.equal(stmt, `select * from super_table where items in ('Jeff','Elon')`)

    sql`select * from super_table where items in (${oneOf()})`.run()
    assert.equal(stmt, `select * from super_table where items in ()`)

    sql`select * from super_table where items in (${oneOf([null, undefined, ''])})`.run()
    assert.equal(stmt, `select * from super_table where items in (NULL,NULL,'')`)

    sql`select * from super_table where items in (${oneOf([true, false])})`.run()
    assert.equal(stmt, `select * from super_table where items in (1.0,0.0)`)
  })

  it('maps raw sql', async () => {
    sql`select * from super_table ${raw(true ? `where x = 'XXXX'` : '')}`.run()
    assert.equal(stmt, `select * from super_table where x = 'XXXX'`)
  })

  it('maps nested arrays and objects correctly', async () => {
    sql`select ${[1, 2, 3]}, ${{ a: 123 }}, ${{ a: "O'Reilly" }}`.run()
    assert.equal(stmt, `select '[1,2,3]', '{"a":123}', '{"a":"O''Reilly"}'`)
  })
})
