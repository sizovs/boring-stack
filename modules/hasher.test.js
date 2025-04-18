import { describe, it, before } from 'node:test'
import assert from 'node:assert'
import { fs } from 'memfs'
import { Hasher } from './hasher.js'

let hasher
before(() => {
  fs.mkdirSync('/static-files')
  fs.mkdirSync('/static-files/nest')
  fs.writeFileSync(`/static-files/a.css`, `aaaaaaaaaaaaa`)
  fs.writeFileSync(`/static-files/b.css`, `bbbbbbbbbbbbb`)
  fs.writeFileSync(`/static-files/nest/n.css`, `nnnnnnnnnnnnn`)
  hasher = new Hasher({ root: '/static-files', prefix: '/static/', filesystem: fs })
})

describe('hasher', async () => {
  it('hashes static assets', () => {
    assert.strictEqual(hasher.hashed('/static/b.css'), '/static/b.1efc98f0.css')
    assert.strictEqual(hasher.hashed('/static/a.css'), '/static/a.c162de19.css')
    assert.strictEqual(hasher.hashed('/static/nest/n.css'), '/static/nest/n.83a8818d.css')
    assert.strictEqual(hasher.hashed('/static/missing.css'), '/static/missing.css')
  })

  it('replaces links in a string', () => {
    const withHashes = hasher.hashLinks(`
        <script type="module" src="/static/b.css" defer></script>
        <link rel="stylesheet" href="/static/nest/n.css" />
        <link rel="stylesheet" href="/keep/me.css" />`.trim())
    assert.strictEqual(withHashes, `
        <script type="module" src="/static/b.1efc98f0.css" defer></script>
        <link rel="stylesheet" href="/static/nest/n.83a8818d.css" />
        <link rel="stylesheet" href="/keep/me.css" />`.trim())
  })

  it('unhashes static assets', () => {
    assert.strictEqual(hasher.unhashed('/static/a.c162de19.css'), '/static/a.css')
    assert.strictEqual(hasher.unhashed('/static/a.xxxxxxxx.css'), '/static/a.css')
    assert.strictEqual(hasher.unhashed('/static/nest/n.83a8818d.css'), '/static/nest/n.css')
    assert.strictEqual(hasher.unhashed('a.css'), 'a.css')
    assert.strictEqual(hasher.unhashed('x.css'), 'x.css')
  })


})
