import path, { join } from 'path'
import fs from 'fs'
import { createHash } from 'crypto'

class File {
  #fullpath
  #relative
  #filesystem
  constructor(fullpath, relative, filesystem) {
    this.#filesystem = filesystem
    this.#relative = relative
    this.#fullpath = fullpath
  }

  get rel() {
    return this.#relative
  }

  get withHash() {
    // css/app.css -> css/app.<hash>.css
    return this.#relative.replace(this.#ext, '.' + this.#hash + this.#ext)
  }

  get #ext() {
    return path.extname(this.#relative)
  }

  get #hash() {
    return createHash('md5').update(this.#content).digest('hex').substring(0, 8)
  }

  get #content() {
    return this.#filesystem.readFileSync(this.#fullpath)
  }

}

export class Hasher {
  #prefix
  #hashes = new Map() // script.js -> script.<hash>.js
  constructor({ prefix, root, filesystem = fs }) {
    this.#prefix = prefix
    files(root, filesystem).forEach(file => {
      // We prepend /prefix/ for O(1) lookup. Given the /static/ prefix:
      // /css/main.css becomes /static/css/main.css,
      // /css/main.<hash>.css becomes /static/css/main.<hash>.css
      this.#hashes.set(join(prefix, file.rel), join(prefix, file.withHash))
    })
  }
  hashed(path) {
    return this.#hashes.get(path) ?? path
  }
  unhashed(path) {
    return path.startsWith(this.#prefix) ? path.replace(/\.[a-z0-9]{8}\./, '.') : path
  }
}

function files(root, filesystem) {
  return filesystem.readdirSync(root, { withFileTypes: true }).map(dirent => {
    const absolute = path.join(root, dirent.name)
    const relative = path.relative(root, absolute)
    return dirent.isDirectory() ? files(absolute, filesystem) : new File(absolute, relative, filesystem)
  }).flat()
}
