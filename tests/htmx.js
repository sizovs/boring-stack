import { expect } from '@playwright/test'

export async function expectHtmxReady(page) {
  await expect(page.locator('.htmx-request, .htmx-swapping, .htmx-settling, .htmx-added')).toHaveCount(0)
}
