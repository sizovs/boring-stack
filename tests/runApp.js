import { startApp } from '#application/app.js';
import { recreateDatabase } from '#modules/database/database.js';
import { getActiveTest } from '@japa/runner'

export async function createApp() {
  const server = await startApp(3001)
  const test = getActiveTest()
  console.log('started')
  test.cleanup(() => {
    recreateDatabase()
    server.close()
  })

  return server
}
