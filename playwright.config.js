import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  reporter: 'html',
  use: {
    baseURL: 'http://127.0.0.1:3001',
    trace: 'on-first-retry',
  },

  // webServer: {
  //   command: 'npm run start',
  //   url: 'http://127.0.0.1:3000',
  //   reuseExistingServer: !process.env.CI,
  // },
});

