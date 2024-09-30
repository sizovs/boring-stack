import pino from "pino"

const formatters = {
  level (label) {
    return { level: label }
  }
}
export const logger = pino({
  formatters
})
