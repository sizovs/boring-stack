import cors from "cors"
export const enableCors = ({ app, isDevMode }) => {
  app.use(cors({
    credentials: true,
    origin: isDevMode || 'https://dev.club'
  }))
}
