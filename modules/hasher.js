import { join, relative, extname } from 'path'
import { readFileSync, readdirSync } from 'fs'
import { createHash } from 'crypto'

export class Hasher {
  #hashes = new Map() // script.js -> script.c040ed4.js
  constructor({ prefix, root }) {
    const hash = path => {
      const file = readFileSync(path)
      return createHash('md5').update(file).digest('hex').substring(0, 8)
    }
    files(root).forEach(path => {
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
    return path.replace(/\.([a-zA-Z0-9]{8})\./, '.');
  }
}

function files(directory) {
  return readdirSync(directory, { withFileTypes: true }).map(dirent => {
    const fullPath = join(directory, dirent.name)
    return dirent.isDirectory() ? files(fullPath) : fullPath
  }).flat()
}
