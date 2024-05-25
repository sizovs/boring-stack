import { Router } from 'itty-router'

const router = Router()

router.put('/:key/:value', async (request, env) => {
  const authorizationKey = request.headers.get('Authorization')
  if (authorizationKey !== env.WORKER_SECRET) {
    return new Response('Authorization key is missing', { status: 500 })
  }

  const { key, value } = request.params
  if (!key) {
    return new Response('Key is missing', { status: 500 })
  }
  if (!value) {
    return new Response('Value is missing', { status: 500 })
  }

  await env.DATA.put(key, value)
  return new Response(`Added KV ${key}:${value}`, { status: 200 })
})

// Default route for all other requests
router.all('*', async (request, env) => {
  const productionHost = await env.DATA.get('productionHost')
  if (!productionHost) {
    return new Response('productionHost KV is missing. This variable contains the hostname of the production server where the request should be directed.', { status: 500 })
  }

  // Forwarding the request to the host to which productionHost key is currently pointing
  const url = new URL(request.url)
  url.hostname = productionHost

  // Our CF worker adds this token to all requests, and then we're validating its presence in Caddy
  // to make sure <subdomain>.your.domain is only accessible via the CF network, effectively blocking direct external access.
  const secretToken = env.X_SECRET_TOKEN
  if (!secretToken) {
    return new Response('X_SECRET_TOKEN is missing', { status: 500 })
  }

  const requestWithSecretToken = new Request(url.toString(), request);
  requestWithSecretToken.headers.append('X-Secret-Token', secretToken)

  return fetch(requestWithSecretToken)
})

export default {
  async fetch(request, env, ctx) {
    return router.handle(request, env, ctx)
  },
}
