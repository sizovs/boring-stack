import cookieSession from 'cookie-session'
export const sessionMiddleware = ({ app, secret }) => {
  app.use(cookieSession({
    name: 'session',
    secret
  }))
}
