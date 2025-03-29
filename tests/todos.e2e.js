import { startApp } from '#application/app'
import { test, expect } from '@playwright/test'
import { expectHtmxReady } from './htmx'

let app

/** @type {import('playwright').Page} */
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
  await expectHtmxReady(page)
})

test('deletes a todo item', async () => {
  await page.getByRole('checkbox').first().check()
  await expect(page.getByTestId('todo-count')).toHaveText('1 todo')
  await expect(page.getByTestId('todo-item')).toHaveCount(1)
  await page.getByRole('checkbox').first().check()
})
