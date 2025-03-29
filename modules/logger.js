import pino from "pino"

const formatters = {
  level (label) {
    return { level: label }
  }
}
export const logger = pino({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  formatters
})
