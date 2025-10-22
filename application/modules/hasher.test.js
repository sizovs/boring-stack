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
  hasher = new Hasher({ root: '/static-files', prefix: '/static', filesystem: fs })
})

describe('hasher', async () => {
  it('hashes static assets', () => {
    assert.strictEqual(hasher.hashed('/static/b.css'), '/static/b.css?v=1efc98f0')
    assert.strictEqual(hasher.hashed('/static/a.css'), '/static/a.css?v=c162de19')
    assert.strictEqual(hasher.hashed('/static/nest/n.css'), '/static/nest/n.css?v=83a8818d')
    assert.strictEqual(hasher.hashed('/static/missing.css'), '/static/missing.css')
  })

  it('replaces links in a string', () => {
    const withHashes = hasher.hashLinks(`
        <script type="module" src="/static/b.css" defer></script>
        <link rel="stylesheet" href="/static/nest/n.css" />
        <link rel="stylesheet" href="/keep/me.css" />`.trim())
    assert.strictEqual(withHashes, `
        <script type="module" src="/static/b.css?v=1efc98f0" defer></script>
        <link rel="stylesheet" href="/static/nest/n.css?v=83a8818d" />
        <link rel="stylesheet" href="/keep/me.css" />`.trim())
  })

})
