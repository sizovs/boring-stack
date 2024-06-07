import { urlencoded } from "express"
export const enableBodyParsing = ({ app }) => {
  app.use(urlencoded({ extended: true }))
}
