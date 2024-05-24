import { startApp } from '#application/app.js';
import { recreateDatabase } from '#modules/database/database.js';

import { test, expect } from '@playwright/test'

let server

test.beforeEach(async ({ page }) => {
  server = await startApp(3001)
});
test.afterEach(async () => {
  recreateDatabase()
  server.close()
})


test('adds todo items', async ({ page }) => {
  await page.goto('/');
  await page.getByPlaceholder('Description').fill('Homework')
  await page.getByText('Add new todo').click()

  await page.getByPlaceholder('Description').fill('Repairworks')
  await page.getByText('Add new todo').click()

  await expect(page.getByTestId('todo-count')).toHaveText('You have 2 todos')
  await expect(page.getByTestId('todo-title')).toHaveText([
    'Homework',
    'Repairworks'
  ]);

})

test('deletes todo item', async ({ page }) => {
  await page.goto('/');
  await page.getByPlaceholder('Description').fill('Homework')
  await page.getByText('Add new todo').click()
  await expect(page.getByTestId('todo-count')).toHaveText('You have 1 todo')
  await expect(page.getByTestId('todo-title')).toHaveCount(1)
  await page.getByRole('checkbox').click()

  await expect(page.getByTestId('todo-count')).toHaveText('You have 0 todos')
  await expect(page.getByTestId('todo-title')).toHaveCount(0)

})
