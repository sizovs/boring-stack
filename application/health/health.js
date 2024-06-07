/**
 * @param {{ db: import('better-sqlite3').Database }} params
 */
export const initHealth = ({ router, db }) => {
  router.get('/health', (request, response) => {
    const { health } = db.prepare("select 'OK' as health").get()
    response.send(health)
  })
}
