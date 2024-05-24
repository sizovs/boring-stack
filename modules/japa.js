import { configure, processCLIArgs, run } from '@japa/runner'
import { assert } from '@japa/assert'
import { browserClient } from '@japa/browser-client'

processCLIArgs(process.argv.splice(2))
configure({
  suites: [
    {
      name: 'browser',
      timeout: 3 * 1000,
      files: ['tests/browser/**/*.test.js'],
    },
    {
      name: 'unit',
      files: ['**/*.test.js', '!node_modules', '!tests/browser'],
    }
  ],
  plugins: [
    assert(),
    browserClient({
      runInSuites: ['browser']
    })],
})

run()
