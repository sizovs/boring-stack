export const initHealth = ({ router, db }) => {
  router.get('/health', (request, response) => {
    db.exec('select 1')
    response.send(`OK from ${process.env.name}`)
  })
}
