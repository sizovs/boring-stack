import { startApp } from '#application/app'
import { test, expect } from '@playwright/test'

let app

test.beforeAll(async () => {
  app = await startApp()
})

test('returns 503 if cluster is unhealthy', async ({page}) => {
  const response = await page.goto(app.url + '/health')
  expect(response.status()).toBe(503)
})

test('returns 200 if cluster is healthy', async ({page}) => {
  process.emit('message', 'cluster-healthy')
  const response = await page.goto(app.url + '/health')
  expect(response.status()).toBe(200)
})
