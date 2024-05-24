import { defineConfig } from '@playwright/test'

export default defineConfig({
  workers: 2,
  testDir: './tests',
  fullyParallel: true,
  reporter: 'html',
  use: {
    trace: 'on-first-retry',
  },
});

