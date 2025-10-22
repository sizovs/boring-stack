import path, { join } from 'path'
import fs from 'fs'
import { createHash } from 'crypto'

export class Hasher {
  #cache
  constructor({ prefix, root, filesystem = fs }) {
    this.#cache = files(root, filesystem).reduce((cache, file) => {
      // We prepend /prefix/ for O(1) lookup. Given the /static/ prefix:
      // /css/main.css becomes /static/css/main.css,
      // /css/main.<hash>.css becomes /static/css/main.css?v=<hash>
      return cache.set(join(prefix, file.rel(root)), join(prefix, file.withHash(root)))
    }, new Map())
  }

  hashed(path) {
    return this.#cache.get(path) ?? path
  }

  hashLinks(body) {
    let modified = body
    this.#cache.forEach((value, key) => {
      modified = modified.replaceAll(key, value)
    })
    return modified
  }
}

function files(root, filesystem) {
  return filesystem.readdirSync(root, { withFileTypes: true }).map(dirent => {
    const absolute = path.join(root, dirent.name)
    return dirent.isDirectory() ? files(absolute, filesystem) : new File(absolute, filesystem)
  }).flat()
}

class File {
  #absolute
  #filesystem
  constructor(absolute, filesystem) {
    this.#absolute = absolute
    this.#filesystem = filesystem
  }

  rel(root) {
    return path.relative(root, this.#absolute)
  }

  withHash(root) {
    // css/app.css -> css/app.css?v=<hash>
    return this.rel(root) + '?v=' + this.#hash
  }

  get #hash() {
    return createHash('md5').update(this.#content).digest('hex').substring(0, 8)
  }

  get #content() {
    return this.#filesystem.readFileSync(this.#absolute)
  }
}
