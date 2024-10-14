import { startApp } from '#application/app'
import { test, expect } from '@playwright/test'

let baseUrl
test.beforeAll(async () => {
  baseUrl = await startApp()
})

test('returns 503 if cluster is unhealthy', async ({page}) => {
  const response = await page.goto(baseUrl + '/health')
  expect(response.status()).toBe(503)
})

test('returns 200 if cluster is healthy', async ({page}) => {
  process.emit('message', 'cluster-healthy')
  const response = await page.goto(baseUrl + '/health')
  expect(response.status()).toBe(200)
})
