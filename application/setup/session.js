import cookieSession from 'cookie-session'
export const enableSessions = ({ app, secret }) => {
  app.use(cookieSession({
    name: 'session',
    secret
  }))
}
