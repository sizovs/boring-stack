import { connect } from "#modules/database/database"
import { Migrator } from "#modules/database/migrator"
import { initTodos } from "#application/controllers/todos"
import { logger } from "#modules/logger"
import fastify from 'fastify'
import formBody from '@fastify/formbody'
import statics from '@fastify/static'
import session from '@fastify/secure-session'
import { Hasher } from "#modules/hasher"
import { Alert } from "#application/views/Alert"

export const startApp = async (options = { port: 0 }) => {

  let appVersion = 1 // bump the version up to force client refresh.
  let health = 404 // app is unhealthy until cluster signals otherwise.

  const isDevMode = process.env.NODE_ENV !== "production"

  if (!process.env.DB_LOCATION) {
    throw new Error('DB_LOCATION environment variable is missing.')
  }

  const envs = ['development', 'production']
  if (!envs.includes(process.env.NODE_ENV)) {
    throw new Error(`NODE_ENV environment variable must be one of ${envs}.`)
  }

  const { db, sql } = await connect(process.env.DB_LOCATION)

  // In dev mode, we run migrations upon startup.
  // In production, migrations are run by the deployment script.
  if (isDevMode) {
    const migrator = new Migrator(db)
    migrator.migrate()
  }

  const staticsConfig = {
    prefix: '/static/',
    root: process.cwd() + '/static',
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
  app.register(statics, {
    ...staticsConfig,
    cacheControl: false,
  })

  // URL-Encoded forms
  app.register(formBody)

  const insecure = "0000000000000000000000000000000000000000000000000000000000000000"
  const sessionSecret = process.env.COOKIE_SECRET ?? insecure
  if (!isDevMode && sessionSecret === insecure) {
    throw new Error('Cannot use insecure session secret in production')
  }


  app.register(session, [
    // User session
    {
      sessionName: 'session',
      key: Buffer.from(sessionSecret, "hex"),
      expiry: 15552000, // 180 days in seconds
      cookie: {
        maxAge: 34560000,
        path: '/'
      }
    },
    // Flash scope, no need for encryption.
    {
      sessionName: 'flashy',
      key: Buffer.from(insecure, "hex"),
      cookie: {
        path: '/',
      }
    }])

  // Request logging
  app.addHook('onResponse', async (request, reply) => {
    logger.info(`${request.method} ${request.url} ${reply.statusCode} - ${Math.round(reply.elapsedTime)}ms`)
  })

  // Current time (so that tests can manipulate time)
  app.decorateRequest('now', function () {
    if (!isDevMode) {
      return Date.now()
    }
    return +this.headers['x-mock-time'] || +this.query['x-mock-time'] || Date.now()
  })

  // Flash read
  app.decorateRequest('flash', function (key, value) {
    const currentFlash = this.flashy || {}
    this.flashy.delete()
    return currentFlash
  })

  // Flash write
  app.decorateReply('flash', function (key, value) {
    this.request.flashy = this.request.flashy || {}
    this.request.flashy[key] = value
  })

  app.decorateReply('alert', async function ({ lead, follow, classes }) {
    return this
      .header('HX-Retarget', 'body')
      .header('HX-Reselect', '#alert-placeholder')
      .header('HX-Reswap', 'beforeend show:none')
      .render(Alert, { lead, follow, classes: classes || 'bg-slate-800' })
  })

  // CSRF protection
  app.addHook('preHandler', async (request, reply) => {
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) {
      const whitelist = []
      const websiteOrigin = request.protocol + '://' + request.host
      const requestOrigin = request.headers.origin
      const isForeignOrigin = requestOrigin !== websiteOrigin
      if (isForeignOrigin && !whitelist.includes(requestOrigin)) {
        return reply.code(403).send('Cross-site requests are forbidden')
      }
    }
  })

  app.addHook('preHandler', async (request, reply) => {
    const clientVersion = request.headers['x-app-version']
    if (clientVersion && clientVersion < appVersion) {
      return reply.alert({ lead: '🎉 New Release', follow: 'Please refresh the page to use the latest version' })
    }
  })

  app.addHook('onSend', async (request, reply, payload) => {
    return typeof payload !== 'string' ? payload : hasher.hashLinks(payload)
  })

  app.decorateReply('render', function (view, params, mime = 'text/html') {
    const flash = this.request.flash()
    this.type(mime)
    this.send(view({ ...params, flash, appVersion }))
  })

  app.setErrorHandler(async (err, request, reply) => {
    logger.error(err)
    if (request.headers["hx-request"]) {
      return reply.alert({ lead: 'Action failed', follow: err.message, classes: 'bg-red-700' })
    } else {
      return reply.status(err.statusCode || 500).send(err.message)
    }
  })

  await initTodos({ app, db, sql })

  app.get('/', (request, reply) => reply.redirect('/todos'))
  app.get('/health', (request, reply) => reply.status(health).send())

  const healthy = () => health = 200
  const bumpVersion = () => appVersion++

  const url = await app.listen(options)
  logger.info(`Running @ ${url}`)

  return { url, bumpVersion, healthy }
}

