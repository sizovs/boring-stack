import { startApp } from '#application/app'
import { test, expect } from '@playwright/test'

let baseUrl

test.beforeAll(async () => {
  baseUrl = await startApp()
})

test('disallows CSRF attacks', async ({ page }) => {
  const maliciousTodo = "You've been pwned"
  const maliciousPageContent = `
  <html>
    <body>
      <h1>Malicious Page</h1>
      <form id="csrf-form" method="POST" action="${baseUrl}/any">
        <input type="hidden" name="description" value="${maliciousTodo}">
      </form>
      <script>
        document.getElementById('csrf-form').submit()
      </script>
    </body>
  </html>
`

await page.setContent(maliciousPageContent)
await expect(page.locator('body')).toHaveText("Missing csrf secret")

// Passes if CSRF disabled:
// await expect(page.getByTestId('todo-item')).toHaveText([
//   maliciousTodo
// ])
})