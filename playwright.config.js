import { defineConfig } from '@playwright/test'

export default defineConfig({
  timeout: 3 * 60 * 1000,
  maxFailures: 1,
  workers: 2,
  testDir: './tests',
  reporter: 'list'
});

