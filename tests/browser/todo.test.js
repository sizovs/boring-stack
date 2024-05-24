import { test } from '@japa/runner'
import { createApp } from '#tests/runApp.js'

test('adds todo item', async ({ visit }) => {
  await createApp()
  const page = await visit(`http://localhost:3001`)
  await page.getByPlaceholder('Description').type('Homework')
  await page.getByText('Add new todo').click()

  await page.getByPlaceholder('Description').type('Repairworks')
  await page.getByText('Add new todo').click()

  await page.assertText('h1', 'You have 2 todos')
  await page.assertElementsCount('.todos tr', 2)
  await page.assertElementsText('.todos td:last-child', [
    'Homework',
    'Repairworks',
  ])

})

test('deletes todo items', async ({ visit }) => {
  await createApp()
  const page = await visit(`http://localhost:3001`)
  await page.getByPlaceholder('Description').type('Homework')
  await page.getByText('Add new todo').click()
  await page.assertText('h1', 'You have 1 todos')
  await page.assertElementsCount('.todos tr', 1)

  await page.getByRole('checkbox').click()

  await page.assertText('h1', 'You have 0 todos')
  await page.assertElementsCount('.todos tr', 0)

})
