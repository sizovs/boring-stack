export const initHealth = async ({ app, db }) => {
  app.get('/health', (request, reply) => {
    const { health } = db.prepare("select 'OK' as health").get()
    reply.send(health)
  })
}
