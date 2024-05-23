import { configure, processCLIArgs, run } from '@japa/runner'
import { assert } from '@japa/assert'

processCLIArgs(process.argv.splice(2))
configure({
  files: ['**/*.test.js', '!node_modules'],
  plugins: [assert()],
})

run()
