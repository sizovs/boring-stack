import Database from 'better-sqlite3'
import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert'
import { cookieSecret } from './secrets.js'

describe('secrets', async () => {
  let db
  beforeEach(() => {
    db = new Database(":memory:")
    db.exec(`create table secrets (
      id text primary key,
      secret text not null
    ) strict`)
  })

  it('returns existing secret coookie and keeps returning it on consequent calls', () => {
    const existingSecret = 'OX7n+4W3ZRvIg1a0HpBwRA+Wu+O0GezSf9OnrmnqQ2I='
    db.exec(`insert into secrets (id, secret) values ('cookie_secret', '${existingSecret}')`)
    const cookies = [cookieSecret(db), cookieSecret(db), cookieSecret(db)]
    cookies.forEach(cookie => assert.equal(cookie, existingSecret))
  })

  it('generates secret coookie if absent and keeps returning it on consequent calls', () => {
    const cookies = [cookieSecret(db), cookieSecret(db), cookieSecret(db)]
    cookies.forEach(cookie => assert.equal(cookie.length, 44))
    assert.deepStrictEqual(cookies, [cookies[0], cookies[0], cookies[0]])
  })
})
