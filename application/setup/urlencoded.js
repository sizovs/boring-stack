import { urlencoded } from "express"
export const enableFormDataParsing = ({ app }) => {
  app.use(urlencoded({ extended: true }));
}
