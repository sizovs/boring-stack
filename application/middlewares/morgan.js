import morgan from "morgan"
export const morganMiddleware = ({ app, logger }) => {

  const morganMiddleware = morgan(
    ':method :url :status - :response-time ms',
    {
      stream: {
        write: (message) => logger.http(message.trim()),
      },
    }
  );
  app.use(morganMiddleware)

}
