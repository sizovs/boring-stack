import { defineConfig } from '@playwright/test'

// We need if we run e2e tests from IDE. Otherwise, configuration in package.json is enough.
process.env.NODE_ENV = 'development'
process.env.DB_LOCATION = ':memory:'

export default defineConfig({
  testMatch: /.*\.e2e\.js/,
  timeout: 5 * 1000, // 5 seconds
  maxFailures: 1,
  testDir: './tests',
  use: {
    screenshot: 'only-on-failure',
    // headless: false
  }
})

