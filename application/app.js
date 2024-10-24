import { connect } from "#modules/database/database"
import { Migrator } from "#modules/database/migrator"
import { initTodos } from "#application/todos/todos"
import { cookieSecret } from "#modules/secrets"
import { logger } from "#modules/logger"
import { Edge } from 'edge.js'
import crypto from "crypto"
import fastify from 'fastify'
import formBody from '@fastify/formbody'
import statics from '@fastify/static'
import session from '@fastify/secure-session'
import flash from '@fastify/flash'
import createError from '@fastify/error'
import { Hasher } from "#modules/hasher"


export const startApp = async (options = { port: 0 }) => {

  let appVersion = 1.0 // bump the version up to force client refresh.
  let health = 404 // app is unhealthy until cluster signals otherwise.

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

  const staticsConfig = {
    prefix: '/static/',
    root: process.cwd() + '/static',
    ...( !isDevMode && { immutable: true, maxAge: '365d' } )
  }

  // We use Hasher to add a version identifier to the public URLs of static assets (script.js -> script.c040ed4.js)
  // and remove the version when serving files from the file system. (script.c040ed4.js -> script.js)
  // Hashes are calculated at start-up, ensuring there is no performance penalty during lookups.

  // The version is the MD5 hash of the file's content. Thus, when the content changes, the version also changes.
  // This lets us set a far-future expires header for static assets w/o worrying about cache invalidation,
  // while ensuring that the user only downloads static assets that have changed since the last deployment.
  const hasher = new Hasher(staticsConfig)

  const app = fastify({ trustProxy: true, rewriteUrl: req => hasher.unhashed(req.url) })

  // Static files
  app.register(statics, staticsConfig)

  const edge = new Edge({ cache: !isDevMode })
  const viewDirectory = import.meta.dirname
  edge.mount(viewDirectory)
  edge.global('hashed', path => hasher.hashed(path))

  // URL-Encoded forms
  app.register(formBody)

  // Sessions
  app.register(session, {
    key: cookieSecret(db)
  })

  // Request logging
  app.addHook('onResponse', async (request, reply) => {
    logger.info(`${request.method} ${request.url} ${reply.statusCode} - ${Math.round(reply.elapsedTime)}ms`)
  })

  // Flash scope
  app.register(flash)

  // CSRF protection
  const CrossSiteRequestsForbidden = createError('FST_CROSS_SITE_REQUESTS', 'Cross-site requests are forbidden', 403)
  app.addHook('preHandler', async (request, reply) => {
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) {
      const whitelist = []
      const websiteOrigin = request.protocol + '://' + request.host
      const requestOrigin = request.headers.origin
      const isForeignOrigin = requestOrigin !== websiteOrigin
      if (isForeignOrigin && !whitelist.includes(requestOrigin)) {
        return reply.send(new CrossSiteRequestsForbidden())
      }
    }
  })

  const OutdatedClient = createError('FST_OUTDATED_CLIENT', "You're using an outdated client. Please refresh", 205)
  app.addHook('preHandler', async (request, reply) => {
    const clientVersion = request.headers['x-app-version']
    if (clientVersion && clientVersion < appVersion) {
      return reply.send(new OutdatedClient())
    }
  })

  app.decorateReply('render', async function (view, payload) {
    const currentFlash = this.flash()
    const flash = { errors: currentFlash?.errors?.[0] ?? {}, old: currentFlash?.old?.[0] ?? {} }
    const renderer = edge.createRenderer()
    const nonce = crypto.randomBytes(16).toString('base64')
    renderer.share({ ...payload, flash, appVersion, nonce })
    const html = await renderer.render(view)
    this.header('Content-Security-Policy', `default-src 'self'; script-src 'self' 'nonce-${nonce}'; img-src 'self' data:; object-src 'none'; script-src-attr 'none'; style-src 'self'`)
    this.header('Cross-Origin-Opener-Policy', 'same-origin')
    this.header('Cross-Origin-Resource-Policy', 'same-origin')
    this.header('X-Frame-Options', 'SAMEORIGIN')
    this.header('X-Content-Type-Options', 'nosniff')
    this.type('text/html')
    this.send(html)
  })

  app.setErrorHandler(async (err, request, reply) => {
    reply.code(err.statusCode || 500)
    return err.message
  })

  await initTodos({ app, db })

  app.get('/', (request, reply) => reply.redirect('/todos'))
  app.get('/health', (request, reply) => reply.status(health).send())

  const healthy = () => health = 200
  const bumpVersion = () => appVersion++

  const url = await app.listen(options)
  logger.info(`Running @ ${url}`)

  return { url, bumpVersion, healthy }
}

