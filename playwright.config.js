import { defineConfig } from '@playwright/test'

export default defineConfig({
  testMatch: /.*\.e2e\.js/,
  timeout: 5 * 1000, // 5 seconds
  maxFailures: 1,
  testDir: './tests',
})

