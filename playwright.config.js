import { defineConfig } from '@playwright/test'

export default defineConfig({
  testMatch: /.*\.e2e\.js/,
  timeout: 3 * 60 * 1000,
  maxFailures: 1,
  testDir: './tests',
  reporter: 'list'
});

