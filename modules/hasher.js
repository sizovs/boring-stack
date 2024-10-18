import { join, relative, extname } from 'path'
import fs from 'fs'
import { createHash } from 'crypto'

export class Hasher {
  #prefix
  #hashes = new Map() // script.js -> script.c040ed4.js
  constructor({ prefix, root, filesystem = fs }) {
    this.#prefix = prefix
    const hash = path => {
      const file = filesystem.readFileSync(path)
      return createHash('md5').update(file).digest('hex').substring(0, 8)
    }
    files(root, filesystem).forEach(path => {
      const original = join(prefix, relative(root, path))
      const ext = extname(path)
      const hashed = `${original.replace(ext, '')}.${hash(path)}${ext}`
      this.#hashes.set(original, hashed)
    })
  }
  hashed(path) {
    return this.#hashes.get(path) ?? path
  }
  unhashed(path) {
    return path.startsWith(this.#prefix) ? path.replace(/\.([a-zA-Z0-9]{8})\./, '.') : path
  }
}

function files(directory, filesystem) {
  return filesystem.readdirSync(directory, { withFileTypes: true }).map(dirent => {
    const fullPath = join(directory, dirent.name)
    return dirent.isDirectory() ? files(fullPath, filesystem) : fullPath
  }).flat()
}
