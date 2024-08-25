import staticify from "staticify"
import { Edge } from 'edge.js'
import { callbackify } from "util"

export const enableEdgeTemplates = ({ app, isDevMode }) => {
  // In development, when we change static files, staticity doesn't rehash them (it only does when the server restarts),
  // and since staticify sends max-age headers, we're getting old assets if we don't flush the browser's cache.
  // Therefore, in order to always see fresh static assets, we disable caching.
  // And it also works in production because the reverse proxy, not the app, should set static cache headers.
  const statics = staticify('static', {
    sendOptions: {
      maxAge: '0s'
    }
  })
  app.use(statics.middleware)

  const edge = new Edge({ cache: !isDevMode })

  const viewDirectory = process.env.PWD + '/views'
  edge.mount('default', viewDirectory)
  edge.global('static', statics.getVersionedPath)

  app.engine('edge', (template, options, callback) => {
    const renderer = edge.createRenderer()
    const rendered = renderer.render(template, options)
    callbackify(() => rendered)(callback)
  })

  app.set('views', viewDirectory)
  app.set('view engine', 'edge')
}
