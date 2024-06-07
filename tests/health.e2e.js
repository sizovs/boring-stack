import { startApp } from '#application/app.js';
import { test, expect } from '@playwright/test'

let page
let baseUrl

test.beforeAll(async ({ browser }) => {
  baseUrl = await startApp()
  page = await browser.newPage();
});


test('returns OK if app starts successfully', async () => {
  const response = await page.goto(baseUrl + '/health');
  const body = await response.text();
  expect(body).toBe('OK')
})
