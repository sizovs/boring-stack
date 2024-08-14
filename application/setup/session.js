import cookieSession from 'cookie-session'
import cookieParser from 'cookie-parser'
export const enableSessions = ({ app, secret }) => {
  app.use(cookieParser())
  app.use(cookieSession({
    name: 'session',
    secret
  }))
}
