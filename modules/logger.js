import { format, createLogger, transports } from "winston";

const { combine, timestamp, printf, align } = format

const logger = createLogger({
  level: "http",
  format: combine(
    timestamp(),
    align(),
    printf(msg => `${msg.timestamp} ${msg.level}: ${msg.message}`)
  ),
  transports: [
    new transports.Console({
      handleExceptions: true,
      handleRejections: true
    })
  ],
});

export default logger
