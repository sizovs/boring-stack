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
})

class User  {
  #newPrivateProperty = 'private'
  newProperty = 'public'
  prop = 'Local value'
  constructor(item) {
    Object.assign(this, item)
  }
  greeting() {
    return 'Hello, ' + this.fullname
  }
  get fullname() {
    return this.firstname + ' ' + this.lastname
  }
  get newProperties() {
    return [this.#newPrivateProperty, this.newProperty]
  }
}

const assertMapping = user => {
  // adds getters
  assert.equal(user.fullname, 'Jeff Bezos')

  // adds methods
  assert.equal(user.greeting(), 'Hello, Jeff Bezos')

  // adds new properties
  assert.deepStrictEqual(user.newProperties, ['private', 'public'])

  // adds dynamic properties
  assert.equal(user.creationDate, new Date().toISOString().substring(0, 10))

  // DB values take precedence over target entity fields when names match
  assert.equal(user.prop, 'DB value')
}

describe('mapper', () => {
  const sql = `select *, DATE(creationTs, 'unixepoch') AS creationDate, 'DB value' as prop from users`

  it('maps rows like a boss 🎉', () => {
    db.prepare(sql).all().map(as(User)).forEach(assertMapping)
  })

  it('recommends using all() even if one record is retrieved so that map.as(N) can be used', () => {
    const [user] = db.prepare(sql + ' limit 1').all().map(as(User))
    assertMapping(user)
  })

})
