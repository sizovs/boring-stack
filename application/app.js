import { connect } from "#modules/database/database"
import { Migrator } from "#modules/database/migrator"
import { initTodos } from "#application/todos/todos"
import { cookieSecret } from "#modules/secrets"
import { logger } from "#modules/logger"
import { Edge } from 'edge.js'
import fastify from 'fastify'
import formBody from '@fastify/formbody'
import statics from '@fastify/static'
import session from '@fastify/secure-session'
import flash from '@fastify/flash'
import createError from '@fastify/error'

let appVersion = 1.0

export const startApp = async (options = { port: 0 }) => {

  const isDevMode = process.env.NODE_ENV !== "production"

  if (!process.env.DB_LOCATION) {
    throw new Error('DB_LOCATION environment variable is missing.')
  }

  const envs = ['development', 'production']
  if (!envs.includes(process.env.NODE_ENV)) {
    throw new Error(`NODE_ENV environment variable must be one of ${envs}.`)
  }

  const db = await connect(process.env.DB_LOCATION)

  // In dev mode, we run migrations upon startup.
  // In production, migrations are run by the deployment script.
  if (isDevMode) {
    const migrator = new Migrator(db)
    migrator.migrate()
  }

  // All static assets will have a version number appended at the end.
  // Increment the version number to invalidate the CDN cache.
  const staticVersion = 1
  const edge = new Edge({ cache: !isDevMode })
  const viewDirectory = process.cwd() + '/views'
  edge.mount('default', viewDirectory)
  edge.global('static', file => file = `${file}?v=${staticVersion}`)

  const app = fastify({ trustProxy: true })

  // URL-Encoded forms
  app.register(formBody)

  // Sessions
  app.register(session, {
    key: cookieSecret(db)
  })

  // Request logging
  app.addHook('onResponse', (request, reply, done) => {
    logger.info(`${request.method} ${request.url} ${reply.statusCode} - ${Math.round(reply.elapsedTime)}ms`)
    done()
  })

  // Flash scope
  app.register(flash)

  // Static files
  app.register(statics, {
    prefix: '/static',
    root: process.cwd() + '/static',
  })


  app.addHook('onSend', async (request, reply, payload) => {
    reply.header('Content-Security-Policy', `default-src 'self'; img-src 'self' data:; object-src 'none'; script-src-attr 'none'; style-src 'self'`)
    reply.header('Cross-Origin-Opener-Policy', 'same-origin')
    reply.header('Cross-Origin-Resource-Policy', 'same-origin')
    reply.header('X-Frame-Options', 'SAMEORIGIN')
    reply.header('X-Content-Type-Options', 'nosniff')
    return payload
  })

  // Protect against CSRF
  const CrossSiteRequestsForbidden = createError('FST_CROSS_SITE_REQUESTS', 'Cross-site requests are forbidden', 403)
  app.addHook('preHandler', (request, reply, done) => {
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) {
      const whitelist = []
      const websiteOrigin = request.protocol + '://' + request.host
      const requestOrigin = request.headers.origin
      const isForeignOrigin = requestOrigin !== websiteOrigin
      if (isForeignOrigin && !whitelist.includes(requestOrigin)) {
        return reply.send(new CrossSiteRequestsForbidden())
      }
    }
    done()
  })

  const OldClient = createError('FST_OLD_CLIENT', "You're using old client. Please refresh", 205)
  app.addHook('preHandler', (request, reply, done) => {
    const clientVersion = request.headers['x-app-version']
    if (clientVersion && clientVersion < appVersion) {
      return reply.send(new OldClient())
    }
    done()
  })

  app.decorateReply('render', async function (view, payload) {
    const currentFlash = this.flash()
    const flash = { errors: currentFlash?.errors?.[0] ?? {}, old: currentFlash?.old?.[0] ?? {} }
    const edgeRenderer = edge.createRenderer()
    edgeRenderer.share({ ...payload, flash, appVersion})
    const html = await edgeRenderer.render(view)
    this.type('text/html')
    this.send(html)
  })

  app.setErrorHandler(async (err, request, reply) => {
    reply.code(err.statusCode || 500)
    return err.message
  })

  await initTodos({ app, db })

  app.get('/', (request, reply) => {
    reply.redirect('/todos')
  })


  let health = 404
  app.get('/health', (_, reply) => reply.status(health).send())

  const healthy = () => health = 200

  const bumpVersion = () => appVersion++

  const url = await app.listen(options)
  logger.info(`Running @ ${url}`)

  return { url, bumpVersion, healthy }
}

