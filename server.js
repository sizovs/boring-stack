import express from "express"
import morgan from "morgan"
import cors from "cors"
import flash from "req-flash"
import routes from "./application/routes.js"
import logger from "./modules/logger.js"
import staticify from "staticify";
import cookieSession from 'cookie-session'

import vine from '@vinejs/vine'

import { Edge } from 'edge.js'
import { edgeStacks } from 'edge-stacks'
import { callbackify } from "util"

// ensure all process.env variables are in place.
await vine.validate({
  data: process.env,
  schema: vine.object({
    DB_LOCATION: vine.string(),
    COOKIE_SECRET: vine.string(),
    NODE_ENV: vine.enum(['development', 'production'])
  })
})

const isDevMode = process.env.NODE_ENV !== "production"
const viewDirectory = process.env.PWD + '/views'

const app = express();



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

const edge = new Edge({ cache: !isDevMode });
edge.use(edgeStacks)

edge.mount('default', viewDirectory);
edge.global('static', statics.getVersionedPath)

app.engine('edge', (template, options, callback) => {
  const renderer = edge.createRenderer()
  const rendered = renderer.render(template, options)
  callbackify(() => rendered)(callback);
})

// Make flash attributes available to Edge
app.use((request, response, next) => {
  const originalRender = response.render;
  response.render = (view, options, callback) => {
    options.flash = request.flash();
    originalRender.call(response, view, options, callback);
  };
  next();
});

app.set('views', viewDirectory)
app.set('view engine', 'edge')

const morganMiddleware = morgan(
  ':method :url :status - :response-time ms',
  {
    stream: {
      write: (message) => logger.http(message.trim()),
    },
  }
);
app.use(morganMiddleware)
app.use(express.urlencoded({ extended: true }));

app.use(cookieSession({
  name: 'session',
  secret: process.env.COOKIE_SECRET
}))

app.use(flash());
app.use(cors({
  credentials: true,
  origin: isDevMode || 'https://dev.club'
}));


routes(app)

const port = process.env.PORT || 3000;
const server = app.listen(port, () => logger.info("Your app is ready on http://localhost:" + server.address().port))
