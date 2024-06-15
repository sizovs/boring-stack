import staticify from "staticify"

export const enablePugTemplates = ({ app }) => {

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
  app.locals.static = statics.getVersionedPath;
  app.set('views', process.env.PWD + '/views')
  app.set('view engine', 'pug')
  app.set('view options');
}
