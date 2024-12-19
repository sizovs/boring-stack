import { expect } from '@playwright/test'

export async function expectHtmxReady(page) {
  await expect(page.locator('.htmx-request, .htmx-settling, .htmx-swapping, .htmx-added')).toHaveCount(0)
}
