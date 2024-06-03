import Database from 'better-sqlite3';
import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { cookieSecret } from './secrets.js';

describe('secrets', async () => {
  let db
  beforeEach(() => {
    db = new Database(":memory:");
    db.exec(`create table secrets (
      id TEXT PRIMARY KEY,
      value TEXT not null
    ) strict;`)
  });

  it('returns existing secret coookie and keep returning it on consequent calls', () => {
    const existingSecret = '00000000000000000000000000000000000000000000000000000000000000000000000000000'
    db.exec(`INSERT INTO secrets (id, value) VALUES ('COOKIE_SECRET', '${existingSecret}')`)
    const cookies = [cookieSecret(db), cookieSecret(db), cookieSecret(db)]
    cookies.forEach(cookie => assert.equal(cookie, existingSecret))
  })

  it('generates secret coookie if absent and keep returning it on consequent calls', () => {
    const cookies = [cookieSecret(db), cookieSecret(db), cookieSecret(db)]
    cookies.forEach(cookie => assert.equal(cookie.length, 64))
    assert.deepStrictEqual(cookies, [cookies[0], cookies[0], cookies[0]])
  })
})
