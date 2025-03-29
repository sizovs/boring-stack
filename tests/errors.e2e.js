import { startApp } from '#application/app'
import { test, expect } from '@playwright/test'

let app

/** @type {import('playwright').Page} */
let page

test.beforeAll(async ({ browser }) => {
  app = await startApp()
  page = await browser.newPage()
  await page.goto(app.url)
})

test('shows warning on new version', async () => {
  app.bumpVersion()
  await page.getByText('boring.todos').click()
  await expect(page.getByRole('alert')).toHaveText('🎉 New Release | Please refresh the page to use the latest version')
  await page.getByTestId('close').click()
  await expect(page.getByRole('alert')).toBeHidden()
})

test('shows warning on network error', async () => {
  await page.route('**/*', route => route.abort())
  await page.getByText('boring.todos').click()

  await expect(page.getByRole('alert')).toHaveText('Network error. Could not reach the server.')

  // https://github.com/microsoft/playwright/issues/30953
  // await expect(page.getByRole('alert')).toBeHidden({ timeout: 10 * 1000 })
  await page.unroute('**/*')
})
