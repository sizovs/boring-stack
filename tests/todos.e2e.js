import { startApp } from '#application/app.js'
import { test, expect } from '@playwright/test'

let page

test.beforeAll(async ({ browser }) => {
  const baseUrl = await startApp()
  page = await browser.newPage()
  await page.goto(baseUrl)
})


test('starts with zero todos', async () => {
  await expect(page.getByTestId('todo-count')).toHaveText('You have 0 todos')
  await expect(page.getByTestId('todo-title')).toHaveCount(0)
  await expect(page.getByTestId('todo-error')).toBeHidden()
})

test('does not allow empty todo', async () => {
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('todo-error')).toContainText('Task description is required')
})

test('adds todo items', async () => {
  await page.getByPlaceholder('Description').fill('Homework')
  await page.keyboard.press('Enter');

  await page.getByPlaceholder('Description').fill('Repairworks')
  await page.keyboard.press('Enter');

  await expect(page.getByTestId('todo-count')).toHaveText('You have 2 todos')
  await expect(page.getByTestId('todo-title')).toHaveText([
    'Homework',
    'Repairworks'
  ])

})

test('deletes a todo item', async () => {
  await page.getByRole('checkbox').first().click()
  await expect(page.getByTestId('todo-count')).toHaveText('You have 1 todo')
  await expect(page.getByTestId('todo-title')).toHaveCount(1)
})

