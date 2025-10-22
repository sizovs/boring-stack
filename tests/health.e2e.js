import { test, expect } from '@playwright/test'
import { startApp } from '../application/app.js'

let app

test.beforeAll(async () => {
  app = await startApp()
})

test('unhealthy by default', async ({page}) => {
  const response = await page.goto(app.url + '/health')
  expect(response.status()).toBe(404)
})

test('returns 200 when healthy', async ({page}) => {
  app.healthy()
  const response = await page.goto(app.url + '/health')
  expect(response.status()).toBe(200)
})
