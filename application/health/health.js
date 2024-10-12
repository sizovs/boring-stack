/**
* @param {{ app: import("fastify").FastifyInstance }}
*/
export const initHealth = async ({ app }) => {

  let status = 503
  process.on('message', message => {
    if (message === 'cluster-healthy') {
      status = 200
    }
  })
  app.get('/health', (request, reply) => {
    reply.status(status).send('')
  })
}
