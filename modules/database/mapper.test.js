import { before, describe, it } from 'node:test'
import assert from 'node:assert'
import { as } from './mapper.js'
import Database from 'better-sqlite3'

let db

before(() => {
  db = new Database(":memory:")
  db.exec(`create table if not exists users  (
      id integer primary key,
      firstname text,
      lastname text,
      creationTs int default (unixepoch())
    ) strict`)
  db.prepare(`insert into users (firstname, lastname) values (?, ?)`).run('Jeff', 'Bezos')
  db.prepare(`insert into users (firstname, lastname) values (?, ?)`).run('Elon', 'Musk')
})

class User  {
  greeting() {
    return 'Hello, ' + this.fullname
  }
  get fullname() {
    return this.firstname + ' ' + this.lastname
  }
}

describe('mapper', () => {
  const sql = `select *, DATE(creationTs, 'unixepoch') AS creationDate from users`

  it('maps rows like a boss 🎉', () => {
    assertMappings(db.prepare(sql).all().map(as(User)))
  })

  const assertMappings = users => {
    const [jeff, musk] = users
    assertMapping(jeff, "Jeff Bezos")
    assertMapping(musk, "Elon Musk")
  }

  const assertMapping = (user, whois) => {
    // adds getters
    assert.equal(user.fullname, whois)

    // adds methods
    assert.equal(user.greeting(), `Hello, ${whois}`)

    // adds dynamic fields
    assert.equal(user.creationDate, new Date().toISOString().substring(0, 10))
  }
})
