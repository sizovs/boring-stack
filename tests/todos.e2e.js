import { startApp } from '#application/app'
import { test, expect } from '@playwright/test'

let app
let page

test.beforeAll(async ({ browser }) => {
  app = await startApp()
  page = await browser.newPage()
  await page.goto(app.url)
})

test('starts with zero todos', async () => {
  await expect(page.getByTestId('todo-count')).toHaveText('0 todos')
  await expect(page.getByTestId('todo-item')).toHaveCount(0)
  await expect(page.getByTestId('todo-error')).toBeHidden()
})

test('does not allow empty todo thanks to client-side validation', async () => {
  await page.keyboard.press('Enter')
  const validationMessage = await page.$eval('[data-testid="todo-input"]', input => input.validationMessage)
  expect(validationMessage).toBe('Please fill out this field.')
  await expect(page.getByTestId('todo-item')).toHaveCount(0)
})

test('does not allow empty todo thanks to server-side validation', async () => {
  await page.$eval('[data-testid="todo-input"]', input => input.removeAttribute('required'))
  await page.keyboard.press('Enter')
  await expect(page.getByTestId('todo-error')).toContainText('Task description is required')
  await expect(page.getByTestId('todo-item')).toHaveCount(0)
})

test('adds todo items', async () => {
  await page.getByTestId('todo-input').fill('Homework')
  await page.keyboard.press('Enter')

  await page.getByTestId('todo-input').fill('Repairwork')
  await page.keyboard.press('Enter')

  await expect(page.getByTestId('todo-count')).toHaveText('2 todos')
  await expect(page.getByTestId('todo-item')).toHaveText([
    'Homework',
    'Repairwork'
  ])
})

test('deletes a todo item', async () => {
  await page.getByRole('checkbox').first().click()
  await expect(page.getByTestId('todo-count')).toHaveText('1 todo')
  await expect(page.getByTestId('todo-item')).toHaveCount(1)
  await page.getByRole('checkbox').first().click()
})

test('shows warning on network error', async () => {
  await page.route('**/*', route => route.abort())
  await page.getByTestId('todo-input').fill('Homework')
  await page.keyboard.press('Enter')
  await expect(page.getByRole('alert')).toHaveText("Action failed. Are you connected to the internet?")
  await page.unroute('**/*');
})

test('shows warning on server error', async () => {
  await page.route('**/*', route => route.fulfill({ status: 500 }))
  await page.getByTestId('todo-input').fill('Homework')
  await page.keyboard.press('Enter')
  await expect(page.getByRole('alert')).toHaveText("Action failed. Please refresh the page and try again.")
  await page.unroute('**/*');
})

test('shows warning on new version', async () => {
  app.bumpVersion()
  await page.getByTestId('todo-input').fill('Homework')
  await page.keyboard.press('Enter')
  await expect(page.getByRole('alert')).toHaveText("Your app is out of date. Please refresh the page to use the latest version.")
  await page.unroute('**/*');
})
