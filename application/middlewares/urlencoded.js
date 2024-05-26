import { urlencoded } from "express"
export const urlencodedMiddleware = ({ app }) => {
  app.use(urlencoded({ extended: true }));
}
