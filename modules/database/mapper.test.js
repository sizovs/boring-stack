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
  prop = 'overridden'
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

const assertItem = (user) => {
  // adds getters
  assert.equal(user.fullname, 'Jeff Bezos')
  // adds methods
  assert.equal(user.greeting(), 'Hello, Jeff Bezos')
  // adds new properties
  assert.deepStrictEqual(user.newProperties, ['private', 'public'])
}

describe('mapper', async () => {
  it('maps rows like a boss 🎉', () => {
    db.prepare('select * from users').all().map(as(User)).forEach(assertItem)
  })

  it('recommends using all() even if one record is retrieved so that map.as(N) can be used', () => {
    const [user] = db.prepare('select * from users limit 1').all().map(as(User))
    assertItem(user)
  })

  it('recommends using SQL for adding dynamic properties', () => {
    const [user] = db.prepare(`select *, DATE(creationTs, 'unixepoch') AS creationDate from users limit 1`).all().map(as(User))
    assert.equal(user.creationDate, new Date().toISOString().substring(0, 10))
  })

  it('overrides mapper fields with DB fields when name collides', () => {
    const [user] = db.prepare(`select *, 'prop' as prop from users limit 1`).all().map(as(User))
    assert.equal(user.prop, 'prop')
  })

})
