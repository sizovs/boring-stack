import cors from "cors"
export const corsMiddleware = ({ app, isDevMode }) => {
  app.use(cors({
    credentials: true,
    origin: isDevMode || 'https://dev.club'
  }));
}
